import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ActivityLog, Transaction } from '@/types';

/**
 * Dashboard smoke test.
 *
 * The Dashboard pulls in ~10 hooks and renders the merged activity feed, so a
 * rename in any one of them (or a dangling reference left behind by an edit)
 * takes the whole page down at runtime while `tsc` and eslint stay silent.
 * This renders it for real against mocked data and asserts it painted.
 */

const tx = (over: Partial<Transaction> = {}): Transaction =>
  ({
    id: 't1',
    user_id: 'u1',
    amount: 25,
    type: 'expense',
    date: '2026-08-20T10:00:00Z',
    currency_base: 'USD',
    note: '',
    tags: [],
    category: null,
    ...over,
  }) as unknown as Transaction;

const activity = (over: Partial<ActivityLog> = {}): ActivityLog =>
  ({
    id: 'a1',
    user_id: 'u1',
    activity_type: 'debt_created',
    entity_type: 'debt',
    description: 'youOwe|Sam|USD|40.00',
    amount: 40,
    currency: 'USD',
    created_at: '2026-08-21T10:00:00Z',
    ...over,
  }) as unknown as ActivityLog;

let transactionRows: Transaction[] = [];
let activityRows: ActivityLog[] = [];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// Supabase: a chainable stub whose terminal `await` resolves per-table.
vi.mock('@/integrations/supabase/client', () => {
  const build = (table: string) => {
    const result =
      table === 'transactions'
        ? { data: transactionRows, error: null }
        : table === 'activity_log'
          ? { data: activityRows, error: null }
          : { data: [], error: null };
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'in', 'neq']) {
      chain[m] = () => chain;
    }
    chain.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => build(table),
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) },
      channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
      removeChannel: () => {},
    },
  };
});

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatAmount: (n: number) => `$${n}`,
    currency: 'USD',
    currencyVersion: 0,
    formatCompact: (n: number) => `$${n}`,
  }),
  currencyData: { USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' } },
}));
vi.mock('@/hooks/useExchangeRate', () => ({
  useExchangeRate: () => ({ convertAmount: () => Promise.resolve(null) }),
}));
vi.mock('@/hooks/usePaymentReminders', () => ({
  usePaymentReminders: () => ({ reminders: [], refetch: vi.fn() }),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPremium: false, loading: false }),
}));
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', resolvedTheme: 'dark', setTheme: vi.fn() }),
}));
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ language: 'en' }),
  getLanguageLocale: () => 'en-US',
}));

// Heavy children: the smoke test is about the Dashboard's own render, not theirs.
vi.mock('@/components/EnhancedAnalyticsChart', () => ({ EnhancedAnalyticsChart: () => null }));
vi.mock('@/features/gamification/components/HealthScoreCard', () => ({ HealthScoreCard: () => null }));
vi.mock('@/components/dashboard/SavingsSnapshotCard', () => ({ SavingsSnapshotCard: () => null }));
vi.mock('@/components/dashboard/DebtTriageWidget', () => ({ DebtTriageWidget: () => null }));
vi.mock('@/components/ParticlesBackground', () => ({ ParticlesBackground: () => null }));
vi.mock('@/components/StreamingGreeting', () => ({ StreamingGreeting: () => null }));

let firstTimeUser: boolean | null = false;
vi.mock('@/hooks/useFirstTimeUser', () => ({
  useFirstTimeUser: () => ({ isFirstTimeUser: firstTimeUser, refetch: vi.fn() }),
}));

import { Dashboard } from '@/pages/Dashboard';

// The real app wraps routes in a QueryClientProvider (see App.tsx); UpgradeModal
// reaches for it through useSubscriptionPricing.
const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    firstTimeUser = false;
    transactionRows = [];
    activityRows = [];
  });

  it('renders the balance hero without crashing', async () => {
    renderDashboard();
    expect(await screen.findByText('dashboard.mainBalance')).toBeInTheDocument();
  });

  it('renders the activity card with an empty feed', async () => {
    renderDashboard();
    expect(await screen.findByText('dashboard.activityHistory')).toBeInTheDocument();
    expect(await screen.findByText('dashboard.noActivityYet')).toBeInTheDocument();
  });

  it('renders a merged feed of transactions and activity rows', async () => {
    transactionRows = [tx({ id: 't1' })];
    activityRows = [activity({ id: 'a1' })];
    renderDashboard();
    // The activity row renders through the shared description parser.
    expect(await screen.findByText('activity.youOwe')).toBeInTheDocument();
  });

  it('shows the getting-started panel for a first-time user', async () => {
    firstTimeUser = true;
    renderDashboard();
    expect(await screen.findByText('dashboard.gettingStarted')).toBeInTheDocument();
  });

  // Regression: the Dashboard used a hardcoded `pb-24` (96px) while the bottom nav,
  // FAB and ad banner need `140px + var(--ad-banner-h) + safe-area`. With a banner
  // showing, the last rows of the feed sat underneath the nav and were unreachable.
  it('clears the bottom nav and ad banner with pb-page-content', async () => {
    const { container } = renderDashboard();
    await screen.findByText('dashboard.mainBalance');
    expect(container.querySelector('.pb-page-content')).toBeTruthy();
  });

  it('renders a skeleton while the first-time check is unresolved', () => {
    firstTimeUser = null;
    const { container } = renderDashboard();
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
    expect(container.querySelector('.pb-page-content')).toBeTruthy();
  });
});
