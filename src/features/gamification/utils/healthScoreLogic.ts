import { differenceInDays, parseISO } from 'date-fns';

// ─── Score component weights (keep in sync with calculateHealthScore) ────────

export const SCORE_WEIGHTS = {
  budget: 35,
  savings: 50,
  activity: 15,
} as const;

export function getScoreColor(val: number): string {
  if (val >= 80) return '#10b981'; // emerald-500
  if (val >= 50) return '#f59e0b'; // amber-500
  return '#f43f5e'; // rose-500
}

// ─── Milestone badge definitions ──────────────────────────────────────────────

export interface MilestoneBadge {
  score: number;
  key: string;
  name: string;
  emoji: string;
  description: string;
}

const MILESTONE_BADGES: MilestoneBadge[] = [
  { score: 100, key: 'financiallyElite', name: 'Financially Elite', emoji: '🏆', description: 'Perfect score across all categories' },
  { score: 90, key: 'moneyMaster', name: 'Money Master', emoji: '💎', description: 'Exceptional financial discipline' },
  { score: 75, key: 'budgetPro', name: 'Budget Pro', emoji: '⭐', description: 'Strong habits across budgeting and savings' },
  { score: 50, key: 'gettingSteady', name: 'Getting Steady', emoji: '🌱', description: 'Building solid financial foundations' },
];

/**
 * Returns the highest milestone badge earned for a given score.
 * Returns null if the score is below the lowest milestone (50).
 */
export function getMilestoneBadge(score: number): MilestoneBadge | null {
  for (const badge of MILESTONE_BADGES) {
    if (score >= badge.score) {
      return badge;
    }
  }
  return null;
}

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
  insightKey: string;
  insightParams: Record<string, string>;
}

export interface HealthScoreTip {
  text: string;
  component: 'budget' | 'savings' | 'activity' | 'general';
}

/**
 * Returns 1–3 actionable tips based on the weakest score components.
 */
export function generateTips(
  breakdown: { budget: number; savings: number; activity: number },
  total: number,
): HealthScoreTip[] {
  if (total >= 90) {
    return [{ text: "You're in the top tier. Keep it up!", component: 'general' }];
  }

  const tips: HealthScoreTip[] = [];

  if (breakdown.budget < 20) {
    tips.push({ text: "You're overspending. Try setting stricter budgets.", component: 'budget' });
  }

  if (breakdown.savings < 25) {
    tips.push({ text: "Set up a savings goal and contribute monthly to boost this score.", component: 'savings' });
  } else if (breakdown.savings < 35) {
    tips.push({ text: "Enable auto-contribute on your savings goals to earn +5 pts.", component: 'savings' });
  }

  if (breakdown.activity < 10) {
    tips.push({ text: "Log transactions regularly — inactivity costs 2 pts/day.", component: 'activity' });
  }

  if (tips.length === 0) {
    tips.push({ text: "Keep up the good work! Complete more savings goals to push higher.", component: 'general' });
  }

  return tips.slice(0, 3);
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

  let insightKey = 'healthScore.insightSetGoal';
  let insightParams: Record<string, string> = {};

  if (params.completedGoalsCount > 0 && params.latestCompletedGoalName) {
    insightKey = 'healthScore.insightCompletedGoal';
    insightParams = { goalName: params.latestCompletedGoalName };
  } else if (params.hasActiveGoal && params.anyBehindThisPeriod && params.atRiskGoalName) {
    insightKey = 'healthScore.insightBehind';
    insightParams = { goalName: params.atRiskGoalName, required: params.atRiskGoalRequiredLabel || '' };
  } else if (params.hasActiveGoal && params.overdueWithoutContribution && params.atRiskGoalName) {
    insightKey = 'healthScore.insightBehindContribute';
    insightParams = { goalName: params.atRiskGoalName };
  } else if (params.anyGoalOnTrack && params.onTrackGoalName) {
    insightKey = 'healthScore.insightOnTrack';
    insightParams = { goalName: params.onTrackGoalName };
  } else if (params.hasActiveGoal) {
    insightKey = 'healthScore.insightKeepContributing';
  }

  return {
    total: Math.max(0, Math.min(100, budgetScore + savingsScore + activityScore)),
    breakdown: {
      budget: budgetScore,
      savings: savingsScore,
      activity: activityScore,
    },
    insightKey,
    insightParams,
  };
}
