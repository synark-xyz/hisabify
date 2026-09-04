import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchNotifications,
  markNotificationAsRead as markRead,
  deleteNotification as deleteNotif,
  clearAllNotifications as clearAll,
  clearOldNotifications as clearOld,
  AppNotification,
} from '@/lib/notificationManager';
import { logger } from '@/lib/logger';

/**
 * Reactive hook for notifications stored in the database.
 * Subscribes to real-time changes and the custom 'hisabify:notifications-changed' event
 * so the UI stays in sync after any mutation.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchNotifications(user.id);
      setNotifications(data);
      setError(null);
    } catch (err) {
      logger.error(err, { component: 'useNotifications', action: 'refresh' });
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch + cleanup old notifications
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        await clearOld(user.id);
        const data = await fetchNotifications(user.id);
        if (cancelled) return;
        setNotifications(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        logger.error(err, { component: 'useNotifications', action: 'initialFetch' });
        setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  // Real-time subscription (debounced to avoid burst fetches)
  useEffect(() => {
    if (!user) return;

    let debounceTimer: ReturnType<typeof setTimeout>;
    const debouncedRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refresh, 1000);
    };

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        debouncedRefresh,
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  // Also listen for the custom event (fired by notificationManager after mutations)
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('hisabify:notifications-changed', handler);
    return () => window.removeEventListener('hisabify:notifications-changed', handler);
  }, [refresh]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await markRead(user.id, id);
  }, [user]);

  const remove = useCallback(async (id: string) => {
    if (!user) return;
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id));
    await deleteNotif(user.id, id);
  }, [user]);

  const removeAll = useCallback(async () => {
    if (!user) return;
    setNotifications([]);
    await clearAll(user.id);
  }, [user]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    refresh,
    markAsRead,
    remove,
    removeAll,
  };
}
