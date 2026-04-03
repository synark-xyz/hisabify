import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_TO_SCREEN: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/insights': 'Insights',
  '/analytics': 'Insights',
  '/budget': 'Budget',
  '/savings': 'Budget',
  '/reports': 'Insights',
  '/profile': 'Profile',
  '/profile/personal': 'Profile_Personal',
  '/profile/data': 'Profile_Data',
  '/profile/invite': 'Referrals',
  '/settings': 'Settings',
  '/settings/preferences': 'Preferences',
  '/settings/notifications': 'Notification_Settings',
  '/notifications': 'Notifications',
  '/auth': 'Auth',
  '/support': 'Support',
  '/faq': 'FAQ',
};

/**
 * Automatically logs screen_view events to Firebase Analytics
 * whenever the route changes.
 */
export function useScreenTracking(): void {
  const { pathname } = useLocation();
  const prevPathRef = useRef<string>('');

  useEffect(() => {
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;

    const screenName = ROUTE_TO_SCREEN[pathname] || pathname;

    import('@/lib/analytics').then(({ analytics }) => {
      analytics.logScreenView(screenName);
    }).catch(() => {});
  }, [pathname]);
}
