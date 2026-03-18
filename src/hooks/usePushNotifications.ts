import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { addPushNotification } from '@/lib/notificationManager';

/**
 * Registers the Android device for FCM push notifications and handles
 * foreground push messages + notification tap navigation.
 *
 * Foreground system-tray display is handled by the Capacitor plugin
 * via `presentationOptions: ["alert", "sound"]` in capacitor.config.ts.
 *
 * Only activates on Android (Capacitor). On web/iOS this is a no-op.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Track whether PushNotifications.register() has been called (persists across re-renders)
  const registeredRef = useRef(false);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    if (!user) return;

    let cancelled = false;
    let pluginRef: typeof import('@capacitor/push-notifications').PushNotifications | null = null;

    const setup = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        pluginRef = PushNotifications;

        if (cancelled) return;

        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          const requested = await PushNotifications.requestPermissions();
          if (requested.receive !== 'granted') {
            logger.info('[PushNotifications] Permission not granted');
            return;
          }
        } else if (permStatus.receive !== 'granted') {
          logger.info('[PushNotifications] Permission denied');
          return;
        }

        if (cancelled) return;

        // Remove any stale listeners before adding new ones
        await PushNotifications.removeAllListeners();

        // Only call register() once across the app lifetime
        if (!registeredRef.current) {
          await PushNotifications.createChannel({
            id: 'hisabify_reminders',
            name: 'Payment Reminders',
            description: 'Alerts for upcoming payment due dates and budget limits',
            importance: 5,
            visibility: 1,
            vibration: true,
            sound: 'default',
          });

          await PushNotifications.register();
          registeredRef.current = true;
        }

        if (cancelled) return;

        // --- Listeners (re-registered every time the effect runs) ---

        await PushNotifications.addListener('registration', async (token) => {
          logger.info(`[PushNotifications] Registered with token: ${token.value.substring(0, 20)}...`);

          try {
            const { error } = await supabase
              .from('fcm_tokens')
              .upsert(
                {
                  user_id: user.id,
                  token: token.value,
                  platform: 'android',
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,token' }
              );

            if (error) {
              logger.error(error, { component: 'PushNotifications', action: 'storeToken' });
            } else {
              logger.info('[PushNotifications] Token stored in fcm_tokens table');
            }
          } catch (err) {
            logger.error(err, { component: 'PushNotifications', action: 'storeTokenCatch' });
          }
        });

        await PushNotifications.addListener('registrationError', (err) => {
          logger.error(err, { component: 'PushNotifications', action: 'registrationError' });
        });

        // Foreground push received — store in notificationManager.
        // System-tray alert is handled by the Capacitor plugin via presentationOptions.
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          const data = (notification.data ?? {}) as Record<string, string>;
          const title = notification.title || data['title'] || 'Notification';
          const body = notification.body || data['body'] || data['message'] || '';
          logger.info(`[PushNotifications] Foreground: ${title} — ${body}`);

          const rawDeepLink = data['deeplink'] ?? data['url'] ?? data['route'] ?? undefined;
          addPushNotification(title, body, rawDeepLink, data);
        });

        // Notification tapped (foreground OR background).
        // Foreground: pushNotificationReceived already stored it — just navigate.
        // Background: only this event fires, so we must store it here.
        // The edge function duplicates title/body into data so we can read them.
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = (action.notification?.data ?? {}) as Record<string, string>;
          const title = action.notification?.title || data['title'] || '';
          const body = action.notification?.body || data['body'] || data['message'] || '';
          const rawDeepLink = data['deeplink'] ?? data['url'] ?? data['route'] ?? undefined;

          // Only store if we have a real title (not empty / fallback).
          // For foreground taps, pushNotificationReceived already stored it
          // and the 60s dedup window will prevent a duplicate.
          if (title) {
            addPushNotification(title, body, rawDeepLink, data);
          }

          if (rawDeepLink) {
            const path = rawDeepLink.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, '');
            navigate(path.startsWith('/') ? path : `/${path}`);
          } else {
            navigate('/notifications');
          }
        });

      } catch (err) {
        logger.error(err, { component: 'PushNotifications', action: 'setup' });
      }
    };

    setup();

    return () => {
      cancelled = true;
      pluginRef?.removeAllListeners();
    };
  }, [user, navigate]);
}

/**
 * Removes the current device FCM token from the database.
 * Call when the user disables push notifications.
 */
export async function removeFcmToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('fcm_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);

  if (error) {
    logger.error(error, { component: 'PushNotifications', action: 'removeToken' });
  }
}
