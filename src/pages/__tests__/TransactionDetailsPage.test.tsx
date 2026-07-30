import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TransactionDetailsPage } from '@/pages/TransactionDetailsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => params ? `${key} ${JSON.stringify(params)}` : key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: (n: number) => `$${n}`, currency: 'USD', formatCompact: (n: number) => `$${n}` }),
  currencyData: { USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' } },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('@/hooks/useExchangeRate', () => ({
  useExchangeRate: () => ({ convertAmount: () => Promise.resolve(null), getExchangeRate: () => Promise.resolve(null), getCachedRate: () => null, prefetchRates: () => Promise.resolve(), loading: false }),
}));

vi.mock('@/hooks/useBudgets', () => ({
  useBudgets: () => ({ budgets: [], loading: false, error: null }),
}));

vi.mock('@/hooks/useSavingsGoals', () => ({
  useSavingsGoals: () => ({ activeGoals: [], goals: [], isLoading: false }),
}));

vi.mock('@/hooks/useRecurringExpenses', () => ({
  useRecurringExpenses: () => ({ recurringExpenses: [], loading: false }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('TransactionDetailsPage', () => {
  it('renders loading state initially', () => {
    render(
      <MemoryRouter initialEntries={['/transactions/123']}>
        <Routes>
          <Route path="/transactions/:id" element={<TransactionDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });
});
