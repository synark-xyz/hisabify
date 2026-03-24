import { useNotifications } from '@/hooks/useNotifications';

/** Returns the count of unread in-app notifications. */
export function useUnreadCount(): number {
  const { unreadCount } = useNotifications();
  return unreadCount;
}
