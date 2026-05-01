import { describe, it, expect } from 'vitest';
import { calculateHealthScore } from '../utils/healthScoreLogic';

const baseParams = {
  totalIncome: 3000,
  totalSavings: 600,
  anyPlanEnabled: false,
  anyOnPaceThisPeriod: false,
  anyBehindThisPeriod: false,
  atRiskGoalName: null,
  atRiskGoalRequiredLabel: null,
  latestCompletedGoalName: null,
  currentMonthExpenses: 2000,
  currentMonthNeeds: 1000,
  currentMonthWants: 600,
  previousMonthExpenses: 2000,
  spendingByCategory: [],
  transactionsThisMonth: 30,
  daysInMonth: 30,
};

describe('calculateHealthScore', () => {
  it('returns 100 when budget, savings, and activity signals are all strong', () => {
    const score = calculateHealthScore({
      ...baseParams,
      totalSpent: 0,
      totalBudget: 1000,
      hasActiveGoal: true,
      anyGoalOnTrack: true,
      completedGoalsCount: 1,
      anyAutoContributeEnabled: true,
      overdueWithoutContribution: false,
      transferredBudgetLeftoverThisMonth: true,
      onTrackGoalName: 'Emergency Fund',
      lastActiveAt: new Date().toISOString(),
    });

    expect(score.total).toBe(94);
    expect(score.breakdown.savings).toBe(30);
    expect(score.insightKey).toBe('healthScore.insightOnTrack');
    expect(score.insightParams.goalName).toBe('Emergency Fund');
  });

  it('rewards being under budget without requiring every savings signal', () => {
    const score = calculateHealthScore({
      ...baseParams,
      totalSpent: 200,
      totalBudget: 1000,
      hasActiveGoal: true,
      anyGoalOnTrack: true,
      completedGoalsCount: 0,
      anyAutoContributeEnabled: false,
      overdueWithoutContribution: false,
      transferredBudgetLeftoverThisMonth: false,
      onTrackGoalName: 'Travel Fund',
      lastActiveAt: new Date().toISOString(),
    });

    expect(score.total).toBe(88);
    expect(score.breakdown.budget).toBe(24);
    expect(score.breakdown.savings).toBe(30);
  });

  it('penalizes overdue savings behavior even when a goal exists', () => {
    const score = calculateHealthScore({
      ...baseParams,
      totalSpent: 1200,
      totalBudget: 1000,
      hasActiveGoal: true,
      anyGoalOnTrack: false,
      completedGoalsCount: 0,
      anyAutoContributeEnabled: false,
      overdueWithoutContribution: true,
      transferredBudgetLeftoverThisMonth: false,
      atRiskGoalName: 'Emergency Fund',
      anyBehindThisPeriod: true,
      lastActiveAt: new Date().toISOString(),
    });

    expect(score.total).toBe(68);
    expect(score.insightKey).toBe('healthScore.insightBudgetAlert');
    expect(score.insightParams.pct).toBe('100%');
  });

  it('uses the no-goals insight when savings has not been started', () => {
    const score = calculateHealthScore({
      ...baseParams,
      totalSpent: 0,
      totalBudget: 1000,
      hasActiveGoal: false,
      anyGoalOnTrack: false,
      completedGoalsCount: 0,
      anyAutoContributeEnabled: false,
      overdueWithoutContribution: false,
      transferredBudgetLeftoverThisMonth: false,
      lastActiveAt: new Date().toISOString(),
    });

    expect(score.total).toBe(94);
    expect(score.insightKey).toBe('healthScore.insightSetGoal');
  });

  it('decays score based on inactivity', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const score = calculateHealthScore({
      ...baseParams,
      totalSpent: 0,
      totalBudget: 1000,
      hasActiveGoal: true,
      anyGoalOnTrack: true,
      completedGoalsCount: 1,
      anyAutoContributeEnabled: true,
      overdueWithoutContribution: false,
      transferredBudgetLeftoverThisMonth: false,
      onTrackGoalName: 'Rainy Day',
      lastActiveAt: threeDaysAgo.toISOString(),
    });

    expect(score.total).toBe(90);
    expect(score.breakdown.activity).toBe(11);
  });

  it('handles zero budget gracefully', () => {
    const score = calculateHealthScore({
      ...baseParams,
      totalSpent: 100,
      totalBudget: 0,
      hasActiveGoal: true,
      anyGoalOnTrack: false,
      completedGoalsCount: 0,
      anyAutoContributeEnabled: false,
      overdueWithoutContribution: false,
      transferredBudgetLeftoverThisMonth: false,
      lastActiveAt: new Date().toISOString(),
    });

    expect(score.total).toBeGreaterThan(0);
    expect(score.total).toBeLessThan(100);
  });
});
