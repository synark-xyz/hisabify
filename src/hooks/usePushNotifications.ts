import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
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
    let appStateHandleRef: { remove: () => Promise<void> } | null = null;

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

        // --- Listeners must be registered BEFORE register() to avoid missing
        //     the token event if it fires synchronously from the cached FCM token ---

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

        // Only call register() once across the app lifetime — channel is created
        // natively via AndroidManifest meta-data so no JS createChannel() needed.
        if (!registeredRef.current) {
          await PushNotifications.register();
          registeredRef.current = true;
        }

        if (cancelled) return;

        // Helper: ingest delivered notifications from the system tray.
        // Called on foreground resume and on initial mount to capture
        // notifications that arrived while the app was backgrounded/killed.
        const ingestDelivered = async () => {
          try {
            const { notifications } = await PushNotifications.getDeliveredNotifications();
            for (const n of notifications) {
              const data = (n.data ?? {}) as Record<string, string>;
              const title = n.title || data['title'] || '';
              const body = n.body || data['body'] || data['message'] || '';
              const rawDeepLink = data['deeplink'] ?? data['url'] ?? data['route'] ?? undefined;
              if (title) {
                await addPushNotification(user.id, title, body, rawDeepLink, data, n.id);
              }
            }
          } catch (err) {
            logger.error(err, { component: 'PushNotifications', action: 'ingestDelivered' });
          }
        };

        // Foreground push received — store in notificationManager.
        // System-tray alert is handled by the Capacitor plugin via presentationOptions.
        await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          const data = (notification.data ?? {}) as Record<string, string>;
          const title = notification.title || data['title'] || 'Notification';
          const body = notification.body || data['body'] || data['message'] || '';
          logger.info(`[PushNotifications] Foreground: ${title} — ${body}`);

          const rawDeepLink = data['deeplink'] ?? data['url'] ?? data['route'] ?? undefined;
          await addPushNotification(user.id, title, body, rawDeepLink, data, notification.id);
        });

        // Notification tapped (foreground OR background OR killed-app cold start).
        // The edge function duplicates title/body into data so we can always read them.
        await PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
          const data = (action.notification?.data ?? {}) as Record<string, string>;
          const title = action.notification?.title || data['title'] || '';
          const body = action.notification?.body || data['body'] || data['message'] || '';
          const rawDeepLink = data['deeplink'] ?? data['url'] ?? data['route'] ?? undefined;

          if (title) {
            await addPushNotification(user.id, title, body, rawDeepLink, data, action.notification?.id);
          }

          if (rawDeepLink) {
            const path = rawDeepLink.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, '');
            navigate(path.startsWith('/') ? path : `/${path}`);
          } else {
            navigate('/notifications');
          }
        });

        // Capture notifications that arrived while backgrounded/killed by polling
        // getDeliveredNotifications() whenever the app comes to the foreground.
        appStateHandleRef = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) ingestDelivered();
        });

        // Also run once on setup to capture the cold-start case (app was killed,
        // user taps notification — the event fires but we also sweep the tray).
        await ingestDelivered();

      } catch (err) {
        logger.error(err, { component: 'PushNotifications', action: 'setup' });
      }
    };

    setup();

    return () => {
      cancelled = true;
      pluginRef?.removeAllListeners();
      appStateHandleRef?.remove();
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
