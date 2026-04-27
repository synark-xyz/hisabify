import { describe, it, expect } from 'vitest';
import { calculateBudgetStatus, computeBudgetSpending, dedupeBudgetPeriods } from '@/lib/budgetUtils';

describe('calculateBudgetStatus', () => {
  it('returns "safe" when spent is below threshold', () => {
    expect(calculateBudgetStatus(50, 100, 75)).toBe('safe');
    expect(calculateBudgetStatus(74, 100, 75)).toBe('safe');
  });

  it('returns "warning" at 75% threshold', () => {
    expect(calculateBudgetStatus(75, 100, 75)).toBe('warning');
    expect(calculateBudgetStatus(99, 100, 75)).toBe('warning');
  });

  it('returns "utilized" when spent equals budget', () => {
    expect(calculateBudgetStatus(100, 100, 75)).toBe('utilized');
  });

  it('returns "exceeded" when spent exceeds budget', () => {
    expect(calculateBudgetStatus(101, 100, 75)).toBe('exceeded');
  });
});

describe('computeBudgetSpending', () => {
  it('computes spent, remaining, percentage, status', () => {
    const budget = {
      id: 'b1',
      user_id: 'u1',
      category_id: null,
      amount: 100,
      month: 1,
      year: 2026,
      period_type: 'monthly' as const,
      start_date: null,
      end_date: null,
      name: 'Test',
      is_template: false,
      is_recurring: false,
      template_name: null,
      alert_threshold: 75,
      alert_enabled: true,
      created_at: '',
      updated_at: '',
    };

    const result = computeBudgetSpending(budget, 80, 75);
    expect(result.spent).toBe(80);
    expect(result.remaining).toBe(20);
    expect(result.percentage).toBe(80);
    expect(result.status).toBe('warning');
  });

  it('handles zero budget amount', () => {
    const budget = {
      id: 'b1',
      user_id: 'u1',
      category_id: null,
      amount: 0,
      month: 1,
      year: 2026,
      period_type: 'monthly' as const,
      start_date: null,
      end_date: null,
      name: 'Test',
      is_template: false,
      is_recurring: false,
      template_name: null,
      alert_threshold: 75,
      alert_enabled: true,
      created_at: '',
      updated_at: '',
    };

    const result = computeBudgetSpending(budget, 50);
    expect(result.percentage).toBe(0);
    expect(result.status).toBe('safe');
  });
});

describe('dedupeBudgetPeriods', () => {
  const makeBudget = (id: string, spent: number, start_date: string | null, status: 'safe' | 'warning' | 'utilized' | 'exceeded') => ({
    id,
    user_id: 'u1',
    category_id: 'cat1',
    amount: 100,
    month: 1,
    year: 2026,
    period_type: 'monthly' as const,
    start_date,
    end_date: null,
    name: 'Test',
    is_template: false,
    is_recurring: false,
    template_name: null,
    alert_threshold: 75,
    alert_enabled: true,
    created_at: '',
    updated_at: '',
    spent,
    remaining: 100 - spent,
    percentage: spent,
    status,
  });

  it('returns single budget as-is', () => {
    const budgets = [makeBudget('b1', 50, null, 'safe')];
    const result = dedupeBudgetPeriods(budgets);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b1');
  });
});