import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

interface PageShellProps {
  /** i18n key, or a literal string if it is already translated (e.g. a merchant name). */
  title: string;
  /** Where the back button goes. Omit for `navigate(-1)`. */
  backTo?: string;
  /** Right-hand slot in the bar — an edit button, a filter toggle, etc. */
  actions?: React.ReactNode;
  /**
   * Whether the bottom navigation is on screen under this page.
   *
   * This controls **bottom padding only** — the nav itself is rendered by `Layout`
   * for routes in the Layout group. Pass `true` from a Layout-group page, `false`
   * (the default) from an isolated `StandalonePage` route.
   */
  withBottomNav?: boolean;
  /** Extra classes for the scrolling content wrapper. */
  className?: string;
  children: React.ReactNode;
}

/**
 * The standard chrome for every page that is not one of the five tabs: a compact
 * appbar with a back button and a title, and nothing else — no avatar, no hamburger.
 *
 * The landing `Header` (avatar + notifications + menu) is rendered by `Layout` and
 * only on tab routes, so a page using `PageShell` shows exactly one bar. Do not add a
 * second bar inside `children`; that is what this component exists to stop.
 */
export function PageShell({
  title,
  backTo,
  actions,
  withBottomNav = false,
  className,
  children,
}: PageShellProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Titles are i18n keys; anything without a dot is treated as a literal so callers
  // can pass dynamic text (a merchant name, a category) straight through.
  const label = title.includes('.') ? t(title) : title;

  return (
    // On Layout-group routes (`withBottomNav`) the Layout `<main>` already supplies both
    // `min-h-screen` and the bottom inset. Repeating either here stacks a second screenful
    // of padding onto the scroll height, which reads as "scrolling runs on past the end".
    <div className={cn(!withBottomNav && 'min-h-screen pb-safe', 'bg-background')}>
      {/* Owns the top safe-area inset: on isolated routes there is no Header above
          this to supply it, and on Layout routes the Header is not rendered. */}
      <header
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/30"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3 flex-nowrap">
          <button
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            aria-label={t('common.back')}
            className="p-2 -ml-2 hover:bg-accent/10 rounded-lg shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-accent" />
          </button>
          <h1 className="text-lg font-semibold truncate">{label}</h1>
          {actions && <div className="ml-auto shrink-0">{actions}</div>}
        </div>
      </header>

      <main className={cn('max-w-2xl mx-auto px-4 py-4', className)}>{children}</main>
    </div>
  );
}
