import { differenceInDays, parseISO } from 'date-fns';

interface HealthScoreParams {
  totalSpent: number;
  totalBudget: number;
  hasActiveGoal: boolean;
  anyGoalOnTrack: boolean;
  hasSavingsContributionThisMonth: boolean;
  completedGoalsCount: number;
  anyAutoContributeEnabled: boolean;
  anyPlanEnabled: boolean;
  anyOnPaceThisPeriod: boolean;
  anyBehindThisPeriod: boolean;
  overdueWithoutContribution: boolean;
  transferredBudgetLeftoverThisMonth: boolean;
  atRiskGoalName?: string | null;
  atRiskGoalRequiredLabel?: string | null;
  onTrackGoalName?: string | null;
  latestCompletedGoalName?: string | null;
  lastActiveAt: string | null;
}

export interface HealthScoreResult {
  total: number;
  breakdown: {
    budget: number;
    savings: number;
    activity: number;
  };
  insight: string;
}

export function calculateHealthScore(params: HealthScoreParams): HealthScoreResult {
  let budgetScore = 0;
  if (params.totalBudget > 0) {
    const adherence = Math.max(0, 1 - params.totalSpent / params.totalBudget);
    budgetScore = Math.round(adherence * 35);
  } else if (params.totalSpent === 0) {
    budgetScore = 35;
  }

  let savingsScore = 0;
  if (params.hasActiveGoal) savingsScore += 10;
  if (params.anyGoalOnTrack) savingsScore += 10;
  if (params.hasSavingsContributionThisMonth) savingsScore += 10;
  if (params.completedGoalsCount > 0) savingsScore += 15;
  if (params.anyAutoContributeEnabled) savingsScore += 5;
  if (params.anyPlanEnabled) savingsScore += 5;
  if (params.anyOnPaceThisPeriod) savingsScore += 10;
  if (params.anyBehindThisPeriod) savingsScore -= 10;
  if (params.transferredBudgetLeftoverThisMonth) savingsScore += 5;
  if (params.overdueWithoutContribution) savingsScore -= 10;
  savingsScore = Math.max(0, Math.min(50, savingsScore));

  let activityScore = 0;
  if (params.lastActiveAt) {
    const daysInactive = Math.abs(differenceInDays(new Date(), parseISO(params.lastActiveAt)));
    activityScore = Math.max(0, 15 - daysInactive * 2);
  }

  let insight = 'Set a savings goal to boost your score.';
  if (params.completedGoalsCount > 0 && params.latestCompletedGoalName) {
    insight = `You completed ${params.latestCompletedGoalName}! Start a new goal to keep growing.`;
  } else if (params.hasActiveGoal && params.anyBehindThisPeriod && params.atRiskGoalName) {
    insight = `You're behind on ${params.atRiskGoalName}. ${params.atRiskGoalRequiredLabel || 'Contribute today.'}`;
  } else if (params.hasActiveGoal && params.overdueWithoutContribution && params.atRiskGoalName) {
    insight = `You're behind on ${params.atRiskGoalName}. Contribute today.`;
  } else if (params.anyGoalOnTrack && params.onTrackGoalName) {
    insight = `${params.onTrackGoalName} is on track — keep it up!`;
  } else if (params.hasActiveGoal) {
    insight = 'Keep contributing to maintain your momentum.';
  }

  return {
    total: Math.max(0, Math.min(100, budgetScore + savingsScore + activityScore)),
    breakdown: {
      budget: budgetScore,
      savings: savingsScore,
      activity: activityScore,
    },
    insight,
  };
}
