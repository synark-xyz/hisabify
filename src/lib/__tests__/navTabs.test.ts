import { describe, it, expect } from 'vitest';
import { NAV_TABS, TAB_TITLES, isTabRoute, isTabActive } from '@/lib/navTabs';

describe('isTabRoute', () => {
  it('matches the five tab roots exactly', () => {
    for (const tab of NAV_TABS) {
      expect(isTabRoute(tab.path)).toBe(true);
    }
  });

  it('does not match child routes — they render their own PageShell bar', () => {
    expect(isTabRoute('/more/calculator')).toBe(false);
    expect(isTabRoute('/transactions/abc-123')).toBe(false);
    expect(isTabRoute('/settings')).toBe(false);
    expect(isTabRoute('/profile')).toBe(false);
  });

  it('does not let "/" swallow every route', () => {
    expect(isTabRoute('/')).toBe(true);
    expect(isTabRoute('/anything')).toBe(false);
  });
});

describe('isTabActive', () => {
  it('keeps the parent tab lit on a child route', () => {
    expect(isTabActive('/more', '/more/calculator')).toBe(true);
    expect(isTabActive('/transactions', '/transactions/abc-123')).toBe(true);
  });

  it('only lights the dashboard on an exact match', () => {
    expect(isTabActive('/', '/')).toBe(true);
    expect(isTabActive('/', '/budget')).toBe(false);
  });

  it('does not match a sibling with a shared prefix', () => {
    expect(isTabActive('/budget', '/budgeting')).toBe(false);
  });
});

describe('TAB_TITLES', () => {
  it('has a title for every tab — Layout indexes it directly', () => {
    for (const tab of NAV_TABS) {
      expect(TAB_TITLES[tab.path]).toBeTruthy();
    }
  });
});
