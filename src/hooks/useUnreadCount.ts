import { useState, useEffect } from 'react';
import { getNotifications } from '@/lib/notificationManager';

/** Returns the count of unread in-app notifications, kept in sync with localStorage. */
export function useUnreadCount(): number {
  const [count, setCount] = useState(() =>
    getNotifications().filter(n => !n.read).length
  );

  useEffect(() => {
    const refresh = () =>
      setCount(getNotifications().filter(n => !n.read).length);

    window.addEventListener('hisabify:notifications-changed', refresh);
    return () => window.removeEventListener('hisabify:notifications-changed', refresh);
  }, []);

  return count;
}
