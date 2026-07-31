import { LayoutDashboardIcon, Target, List, Lightbulb, Grid } from 'lucide-react';

/**
 * The five top-level tabs. Single source of truth for the mobile bottom navigation
 * (`BottomNavigation.tsx`), the desktop sidebar (`Layout.tsx`), and — via
 * `isTabRoute` — for which routes get the landing `Header` instead of a page's own
 * compact `PageShell` bar.
 *
 * These three used to keep separate copies of the same list, which is how a route
 * could end up in the sidebar but not the bottom nav.
 */
export const NAV_TABS = [
  { path: '/', icon: LayoutDashboardIcon, labelKey: 'nav.dashboard' },
  { path: '/budget', icon: Target, labelKey: 'nav.budget' },
  { path: '/transactions', icon: List, labelKey: 'nav.expenses' },
  { path: '/insights', icon: Lightbulb, labelKey: 'nav.insights' },
  { path: '/more', icon: Grid, labelKey: 'nav.more' },
] as const;

/** Title shown in the landing `Header`, keyed by tab path. */
export const TAB_TITLES: Record<string, string> = {
  '/': 'nav.dashboard',
  '/budget': 'nav.budget',
  '/transactions': 'nav.transactions',
  '/insights': 'nav.analytics',
  '/more': 'nav.more',
};

/**
 * True only for the tab roots themselves — `/more` is a tab, `/more/calculator` is a
 * child page. Exact match, so `/` does not swallow every route.
 */
export function isTabRoute(pathname: string): boolean {
  return NAV_TABS.some(tab => tab.path === pathname);
}

/**
 * Whether a tab should render as active. Unlike `isTabRoute` this *does* match
 * children, so `/more/calculator` keeps the More tab lit.
 */
export function isTabActive(tabPath: string, pathname: string): boolean {
  if (tabPath === '/') return pathname === '/';
  return pathname === tabPath || pathname.startsWith(tabPath + '/');
}
