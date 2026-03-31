import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSmartSuggest } from '../useSmartSuggest';
import type { BudgetWithSpending } from '../useBudgets';
import type { SavingsGoalWithProgress } from '../useSavingsGoals';

function makeBudget(overrides: Partial<BudgetWithSpending> = {}): BudgetWithSpending {
  return {
    id: 'b1',
    user_id: 'u1',
    category_id: 'cat-food',
    amount: 5000,
    spent: 1000,
    remaining: 4000,
    percentage: 20,
    status: 'safe',
    period_type: 'monthly',
    start_date: null,
    end_date: null,
    name: 'Food Budget',
    is_template: false,
    is_recurring: true,
    template_name: null,
    created_at: '',
    updated_at: '',
    month: 3,
    year: 2026,
    ...overrides,
  };
}

function makeGoal(overrides: Partial<SavingsGoalWithProgress> = {}): SavingsGoalWithProgress {
  return {
    id: 'g1',
    user_id: 'u1',
    name: 'Home Fund',
    target_amount: 20000,
    current_amount: 8500,
    deadline: '2026-12-31',
    icon: '🏠',
    color: '#7c3aed',
    created_at: '',
    updated_at: '',
    archived_at: null,
    completed_at: null,
    linked_budget_id: null,
    reserve_amount: 0,
    auto_contribute_enabled: false,
    auto_contribute_amount: null,
    auto_contribute_frequency: null,
    plan_frequency: null,
    plan_start_date: null,
    auto_remind: false,
    percentage: 42.5,
    remaining: 11500,
    daysLeft: 275,
    status: 'on_track' as any,
    paceStatus: 'on_track' as any,
    isArchived: false,
    isUrgent: false,
    planEnabled: false,
    contributionHistory: [],
    thisMonthContribution: 0,
    projectedCompletionDate: null,
    projectedCompletionLabel: null,
    monthlyPace: 0,
    averageMonthlyContribution: 0,
    monthsToTarget: null,
    missedMonths: [],
    hasContributedThisMonth: false,
    availableToRedeploy: 0,
    requiredPerPeriod: 0,
    periodsRemaining: 0,
    currentPace: 0,
    currentPeriodAmount: 0,
    periodLabel: 'month',
    periodLabelPlural: 'months',
    requiredThisPeriodLabel: null,
    suggestedDeadline: null,
    suggestedDeadlineLabel: null,
    sparkline: [],
    isOnPaceThisPeriod: true,
    isBehindThisPeriod: false,
    ...overrides,
  };
}

describe('useSmartSuggest', () => {
  describe('expense type', () => {
    it('suggests a budget matching the category', () => {
      const budgets = [makeBudget({ id: 'b1', category_id: 'cat-food', name: 'Food Budget' })];
      const { result } = renderHook(() =>
        useSmartSuggest('expense', 'cat-food', budgets, [])
      );
      expect(result.current?.type).toBe('budget');
      expect(result.current?.item.id).toBe('b1');
    });

    it('falls back to first non-exceeded budget when no category match', () => {
      const budgets = [
        makeBudget({ id: 'b1', category_id: 'cat-transport', name: 'Transport', status: 'safe' }),
      ];
      const { result } = renderHook(() =>
        useSmartSuggest('expense', 'cat-food', budgets, [])
      );
      expect(result.current?.type).toBe('budget');
      expect(result.current?.item.id).toBe('b1');
    });

    it('skips exceeded budgets in fallback', () => {
      const budgets = [
        makeBudget({ id: 'b1', category_id: 'cat-transport', status: 'exceeded' }),
        makeBudget({ id: 'b2', category_id: 'cat-shopping', status: 'safe' }),
      ];
      const { result } = renderHook(() =>
        useSmartSuggest('expense', 'cat-food', budgets, [])
      );
      expect(result.current?.item.id).toBe('b2');
    });

    it('returns null when all budgets are exceeded and no category match', () => {
      const budgets = [makeBudget({ id: 'b1', category_id: 'cat-other', status: 'exceeded' })];
      const { result } = renderHook(() =>
        useSmartSuggest('expense', 'cat-food', budgets, [])
      );
      expect(result.current).toBeNull();
    });

    it('returns null when no budgets exist', () => {
      const { result } = renderHook(() =>
        useSmartSuggest('expense', 'cat-food', [], [])
      );
      expect(result.current).toBeNull();
    });
  });

  describe('income type', () => {
    it('suggests the savings goal with the nearest deadline', () => {
      const goals = [
        makeGoal({ id: 'g1', deadline: '2027-06-01' }),
        makeGoal({ id: 'g2', deadline: '2026-08-01' }),
      ];
      const { result } = renderHook(() =>
        useSmartSuggest('income', null, [], goals)
      );
      expect(result.current?.type).toBe('goal');
      expect(result.current?.item.id).toBe('g2');
    });

    it('prefers goals with a deadline over those without', () => {
      const goals = [
        makeGoal({ id: 'g1', deadline: null }),
        makeGoal({ id: 'g2', deadline: '2026-09-01' }),
      ];
      const { result } = renderHook(() =>
        useSmartSuggest('income', null, [], goals)
      );
      expect(result.current?.item.id).toBe('g2');
    });

    it('skips archived and completed goals', () => {
      const goals = [
        makeGoal({ id: 'g1', isArchived: true }),
        makeGoal({ id: 'g2', percentage: 100 }),
        makeGoal({ id: 'g3', deadline: '2026-11-01' }),
      ];
      const { result } = renderHook(() =>
        useSmartSuggest('income', null, [], goals)
      );
      expect(result.current?.item.id).toBe('g3');
    });

    it('returns null when no active goals exist', () => {
      const { result } = renderHook(() =>
        useSmartSuggest('income', null, [], [])
      );
      expect(result.current).toBeNull();
    });
  });

  describe('lend / owe types', () => {
    it('returns null for lend', () => {
      const { result } = renderHook(() =>
        useSmartSuggest('lend', 'cat-food', [makeBudget()], [makeGoal()])
      );
      expect(result.current).toBeNull();
    });

    it('returns null for owe', () => {
      const { result } = renderHook(() =>
        useSmartSuggest('owe', 'cat-food', [makeBudget()], [makeGoal()])
      );
      expect(result.current).toBeNull();
    });
  });
});
