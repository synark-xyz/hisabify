import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The bottom navigation is `position: fixed`. A fixed element with no `bottom` value does not
 * stick to the viewport bottom — it stays at its static position in flow, which on a scrolled
 * page means off-screen entirely. That is exactly how the nav disappeared: a refactor dropped
 * `style={{ bottom: 'var(--ad-banner-h, 0px)' }}` without replacing it with a `bottom-*` class.
 *
 * These assert the anchoring itself, because it is invisible in a jsdom render otherwise —
 * every button still mounts and every query still passes while the bar sits out of view.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/hooks/useVisualViewport', () => ({
  useVisualViewport: () => ({ isKeyboardOpen: false }),
}));

import { BottomNavigation } from '@/components/BottomNavigation';
import { NAV_TABS } from '@/lib/navTabs';

function renderNav() {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <BottomNavigation />
    </MemoryRouter>,
  );
  return document.querySelector('nav') as HTMLElement;
}

describe('BottomNavigation', () => {
  it('renders every tab', () => {
    renderNav();
    for (const tab of NAV_TABS) {
      expect(screen.getByText(tab.labelKey)).toBeInTheDocument();
    }
  });

  it('is anchored to the bottom of the viewport', () => {
    const nav = renderNav();
    const classes = nav.className;

    expect(classes).toContain('fixed');
    // The regression: `fixed` with no bottom anchor scrolls the bar off-screen.
    const hasBottomClass = /(^|\s)bottom-/.test(classes);
    const hasInlineBottom = Boolean(nav.style.bottom);
    expect(hasBottomClass || hasInlineBottom).toBe(true);
  });

  it('spans the full width and stays above page content', () => {
    const nav = renderNav();
    expect(nav.className).toContain('left-0');
    expect(nav.className).toContain('right-0');
    expect(nav.className).toMatch(/(^|\s)z-\d+/);
  });
});
