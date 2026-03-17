import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { addPushNotification } from '@/lib/notificationManager';

/**
 * Registers the Android device for FCM push notifications and handles
 * foreground push messages + notification tap navigation.
 *
 * Only activates on Android (Capacitor). On web/iOS this is a no-op.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    if (!user) return;
    if (registeredRef.current) return;

    const cleanupFns: Array<() => void> = [];

    const setup = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

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

        // Create notification channel (required for Android 8+)
        await PushNotifications.createChannel({
          id: 'hisabify_reminders',
          name: 'Payment Reminders',
          description: 'Alerts for upcoming payment due dates and budget limits',
          importance: 5, // IMPORTANCE_HIGH
          visibility: 1, // VISIBILITY_PUBLIC
          vibration: true,
          sound: 'default',
        });

        // Create local notifications channel for foreground display
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.createChannel({
          id: 'hisabify_push',
          name: 'Push Notifications',
          importance: 5,
          vibration: true,
        });

        await PushNotifications.register();

        // Token registration
        const regListener = await PushNotifications.addListener('registration', async (token) => {
          logger.info('[PushNotifications] Registered with token');
          registeredRef.current = true;

          // Upsert token into fcm_tokens
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
          }
        });
        cleanupFns.push(() => regListener.remove());

        // Registration error
        const errListener = await PushNotifications.addListener('registrationError', (err) => {
          logger.error(err, { component: 'PushNotifications', action: 'registrationError' });
        });
        cleanupFns.push(() => errListener.remove());

        // Foreground push received — show system tray notification + store in notificationManager
        const fgListener = await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          const title = notification.title ?? 'Notification';
          const body = notification.body ?? '';

          // Show in system tray (foreground only — background is handled by FCM natively)
          try {
            await LocalNotifications.schedule({
              notifications: [{
                id: Date.now() % 2147483647, // must be a 32-bit int
                title,
                body,
                channelId: 'hisabify_push',
              }],
            });
          } catch (localErr) {
            logger.error(localErr, { component: 'PushNotifications', action: 'scheduleLocal' });
            // Fallback to in-app toast if local notification fails
            toast({ title, description: body || undefined });
          }

          // Extract deeplink from FCM data payload (supports "deeplink", "url", or "route" keys)
          const data = (notification.data ?? {}) as Record<string, string>;
          const rawDeepLink = data['deeplink'] ?? data['url'] ?? data['route'] ?? undefined;

          // Store in notificationManager for NotificationsPage
          addPushNotification(title, body, rawDeepLink);
        });
        cleanupFns.push(() => fgListener.remove());

        // Notification tapped — navigate to deeplink or /notifications
        const tapListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = (action.notification?.data ?? {}) as Record<string, string>;
          const rawDeepLink = data['deeplink'] ?? data['url'] ?? data['route'] ?? undefined;
          if (rawDeepLink) {
            // Normalize: strip scheme if present
            const path = rawDeepLink.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, '');
            navigate(path.startsWith('/') ? path : `/${path}`);
          } else {
            navigate('/notifications');
          }
        });
        cleanupFns.push(() => tapListener.remove());

      } catch (err) {
        logger.error(err, { component: 'PushNotifications', action: 'setup' });
      }
    };

    setup();

    return () => {
      cleanupFns.forEach((fn) => fn());
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
