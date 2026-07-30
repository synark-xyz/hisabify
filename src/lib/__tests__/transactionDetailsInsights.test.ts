import { describe, it, expect } from 'vitest';
import { computeBudgetImpact, computeGoalImpact, shouldShowMerchantPattern } from '@/lib/transactionUtils';

describe('computeBudgetImpact', () => {
  it('calculates correct percentage and remaining', () => {
    const budget = { amount: 1000, spent: 400, remaining: 600, percentage: 40, status: 'safe' as const };
    const result = computeBudgetImpact(50, budget);
    expect(result.thisTxPercent).toBeCloseTo(5, 1);
    expect(result.remainingAfter).toBeCloseTo(550, 1);
    expect(result.status).toBe('safe');
  });

  it('shows warning when transaction pushes budget near limit', () => {
    const budget = { amount: 100, spent: 70, remaining: 30, percentage: 70, status: 'warning' as const };
    const result = computeBudgetImpact(25, budget);
    expect(result.thisTxPercent).toBeCloseTo(25, 1);
    expect(result.remainingAfter).toBeCloseTo(5, 1);
    expect(result.status).toBe('warning');
  });

  it('shows exceeded when transaction overshoots budget', () => {
    const budget = { amount: 100, spent: 80, remaining: 20, percentage: 80, status: 'safe' as const };
    const result = computeBudgetImpact(50, budget);
    expect(result.thisTxPercent).toBeCloseTo(50, 1);
    expect(result.remainingAfter).toBeCloseTo(-30, 1);
    expect(result.status).toBe('exceeded');
  });
});

describe('computeGoalImpact', () => {
  it('calculates correct percentage and remaining', () => {
    const goal = { currentAmount: 350, targetAmount: 500, remaining: 150, percentage: 70 };
    const result = computeGoalImpact(45, goal);
    expect(result.thisTxPercent).toBeCloseTo(9, 1);
    expect(result.remainingAfter).toBeCloseTo(105, 1);
  });

  it('caps percentage at 100', () => {
    const goal = { currentAmount: 450, targetAmount: 500, remaining: 50, percentage: 90 };
    const result = computeGoalImpact(100, goal);
    expect(result.thisTxPercent).toBeCloseTo(20, 1);
    expect(result.remainingAfter).toBeCloseTo(-50, 1);
  });
});

describe('shouldShowMerchantPattern', () => {
  it('shows when count >= 2', () => {
    expect(shouldShowMerchantPattern(3, false)).toBe(true);
  });

  it('shows when has recurring match even with count 1', () => {
    expect(shouldShowMerchantPattern(1, true)).toBe(true);
  });

  it('hides when count is 1 and no recurring match', () => {
    expect(shouldShowMerchantPattern(1, false)).toBe(false);
  });

  it('hides when count is 0', () => {
    expect(shouldShowMerchantPattern(0, false)).toBe(false);
  });
});
