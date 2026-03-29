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

/**
 * Reactive hook for notifications stored in the database.
 * Subscribes to real-time changes and the custom 'hisabify:notifications-changed' event
 * so the UI stays in sync after any mutation.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await fetchNotifications(user.id);
    setNotifications(data);
    setLoading(false);
  }, [user]);

  // Initial fetch + cleanup old notifications
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      await clearOld(user.id);
      const data = await fetchNotifications(user.id);
      if (!cancelled) {
        setNotifications(data);
        setLoading(false);
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
    unreadCount,
    refresh,
    markAsRead,
    remove,
    removeAll,
  };
}
