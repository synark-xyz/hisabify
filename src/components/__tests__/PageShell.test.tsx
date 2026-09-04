import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageShell } from '@/components/PageShell';

const navigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

beforeEach(() => navigate.mockClear());

describe('PageShell', () => {
  it('renders exactly one appbar — the whole point of the component', () => {
    render(<PageShell title="nav.profile"><p>body</p></PageShell>);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
  });

  it('translates a dotted title and passes a literal through untouched', () => {
    const { unmount } = render(<PageShell title="nav.profile">x</PageShell>);
    expect(screen.getByRole('heading')).toHaveTextContent('nav.profile');
    unmount();

    render(<PageShell title="Starbucks">x</PageShell>);
    expect(screen.getByRole('heading')).toHaveTextContent('Starbucks');
  });

  it('navigates to backTo when given one', () => {
    render(<PageShell title="nav.more" backTo="/more">x</PageShell>);
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    expect(navigate).toHaveBeenCalledWith('/more');
  });

  it('falls back to history-back when backTo is omitted', () => {
    render(<PageShell title="nav.more">x</PageShell>);
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('reserves bottom safe-area padding only when there is no bottom nav', () => {
    const { container, unmount } = render(<PageShell title="a">x</PageShell>);
    expect(container.firstChild).toHaveClass('pb-safe');
    unmount();

    const { container: withNav } = render(<PageShell title="a" withBottomNav>x</PageShell>);
    expect(withNav.firstChild).not.toHaveClass('pb-safe');
  });

  // Regression: on Layout-group routes the Layout `<main>` already applies
  // `min-h-screen` + the bottom inset. PageShell repeating `min-h-screen` stacked a
  // second full viewport onto the scroll height, so those pages scrolled well past the
  // end of their content before stopping.
  it('leaves min-h-screen to Layout when a bottom nav is present', () => {
    const { container, unmount } = render(<PageShell title="a">x</PageShell>);
    expect(container.firstChild).toHaveClass('min-h-screen');
    unmount();

    const { container: withNav } = render(<PageShell title="a" withBottomNav>x</PageShell>);
    expect(withNav.firstChild).not.toHaveClass('min-h-screen');
  });

  it('renders the actions slot', () => {
    render(
      <PageShell title="a" actions={<button>Edit</button>}>
        x
      </PageShell>,
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});
