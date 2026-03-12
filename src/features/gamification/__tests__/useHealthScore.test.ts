import { describe, it, expect } from 'vitest';
import { calculateHealthScore } from '../utils/healthScoreLogic';

describe('calculateHealthScore', () => {
  it('returns 100 when budget, savings, and activity signals are all strong', () => {
    const score = calculateHealthScore({
      totalSpent: 0,
      totalBudget: 1000,
      hasActiveGoal: true,
      anyGoalOnTrack: true,
      hasSavingsContributionThisMonth: true,
      completedGoalsCount: 1,
      anyAutoContributeEnabled: true,
      overdueWithoutContribution: false,
      transferredBudgetLeftoverThisMonth: true,
      onTrackGoalName: 'Emergency Fund',
      lastActiveAt: new Date().toISOString(),
    });

    expect(score.total).toBe(100);
    expect(score.breakdown.savings).toBe(50);
    expect(score.insight).toContain('Emergency Fund');
  });

  it('rewards being under budget without requiring every savings signal', () => {
    const score = calculateHealthScore({
      totalSpent: 200,
      totalBudget: 1000,
      hasActiveGoal: true,
      anyGoalOnTrack: true,
      hasSavingsContributionThisMonth: true,
      completedGoalsCount: 0,
      anyAutoContributeEnabled: false,
      overdueWithoutContribution: false,
      transferredBudgetLeftoverThisMonth: false,
      onTrackGoalName: 'Travel Fund',
      lastActiveAt: new Date().toISOString(),
    });

    expect(score.total).toBe(73);
    expect(score.breakdown.budget).toBe(28);
    expect(score.breakdown.savings).toBe(30);
  });

  it('penalizes overdue savings behavior even when a goal exists', () => {
    const score = calculateHealthScore({
      totalSpent: 1200,
      totalBudget: 1000,
      hasActiveGoal: true,
      anyGoalOnTrack: false,
      hasSavingsContributionThisMonth: false,
      completedGoalsCount: 0,
      anyAutoContributeEnabled: false,
      overdueWithoutContribution: true,
      transferredBudgetLeftoverThisMonth: false,
      atRiskGoalName: 'Emergency Fund',
      lastActiveAt: new Date().toISOString(),
    });

    expect(score.total).toBe(15);
    expect(score.insight).toContain('Emergency Fund');
  });

  it('uses the no-goals insight when savings has not been started', () => {
    const score = calculateHealthScore({
      totalSpent: 0,
      totalBudget: 1000,
      hasActiveGoal: false,
      anyGoalOnTrack: false,
      hasSavingsContributionThisMonth: false,
      completedGoalsCount: 0,
      anyAutoContributeEnabled: false,
      overdueWithoutContribution: false,
      transferredBudgetLeftoverThisMonth: false,
      lastActiveAt: new Date().toISOString(),
    });

    expect(score.total).toBe(50);
    expect(score.insight).toBe('Set a savings goal to boost your score.');
  });

  it('decays score based on inactivity', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const score = calculateHealthScore({
      totalSpent: 0,
      totalBudget: 1000,
      hasActiveGoal: true,
      anyGoalOnTrack: true,
      hasSavingsContributionThisMonth: true,
      completedGoalsCount: 1,
      anyAutoContributeEnabled: true,
      overdueWithoutContribution: false,
      transferredBudgetLeftoverThisMonth: false,
      onTrackGoalName: 'Rainy Day',
      lastActiveAt: threeDaysAgo.toISOString(),
    });

    expect(score.total).toBe(94);
    expect(score.breakdown.activity).toBe(9);
  });

  it('handles zero budget gracefully', () => {
    const score = calculateHealthScore({
      totalSpent: 100,
      totalBudget: 0,
      hasActiveGoal: true,
      anyGoalOnTrack: false,
      hasSavingsContributionThisMonth: true,
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
