import { differenceInDays, parseISO } from 'date-fns';

export const SCORE_WEIGHTS = {
  budget: 30,
  savings: 30,
  trends: 15,
  activity: 15,
  accuracy: 10,
} as const;

export function getScoreColor(val: number): string {
  if (val >= 80) return '#10b981';
  if (val >= 50) return '#f59e0b';
  return '#f43f5e';
}

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

export function getMilestoneBadge(score: number): MilestoneBadge | null {
  for (const badge of MILESTONE_BADGES) {
    if (score >= badge.score) return badge;
  }
  return null;
}

interface SpendingByCategory {
  categoryId: string | null;
  amount: number;
}

interface HealthScoreParams {
  totalSpent: number;
  totalBudget: number;
  totalIncome: number;
  totalSavings: number;
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
  currentMonthExpenses: number;
  currentMonthNeeds: number;
  currentMonthWants: number;
  previousMonthExpenses: number;
  spendingByCategory: SpendingByCategory[];
  transactionsThisMonth: number;
  daysInMonth: number;
}

export interface HealthScoreResult {
  total: number;
  breakdown: {
    budget: number;
    savings: number;
    trends: number;
    activity: number;
    accuracy: number;
  };
  metrics: {
    savingsRate: number;
    budgetAdherence: number;
    expenseGrowthRate: number;
    topSpendingCategory: string | null;
    needsPercentage: number;
    wantsPercentage: number;
  };
  insightKey: string;
  insightParams: Record<string, string>;
}

export interface HealthScoreTip {
  text: string;
  component: 'budget' | 'savings' | 'activity' | 'general';
}

export function generateTips(
  breakdown: { budget: number; savings: number; activity: number; trends?: number; accuracy?: number },
  total: number,
): HealthScoreTip[] {
  if (total >= 90) {
    return [{ text: "You're in the top tier. Keep it up!", component: 'general' }];
  }

  const tips: HealthScoreTip[] = [];

  if (breakdown.budget < 15) {
    tips.push({ text: "Budget alert: You're at 80%+ spending. Time to cut back!", component: 'budget' });
  }

  if (breakdown.savings < 15) {
    tips.push({ text: "Your savings rate is below 10%. Aim for at least 20% savings.", component: 'savings' });
  }

  if ((breakdown.trends || 0) < 10) {
    tips.push({ text: "Detected spend creep: Your expenses are growing month-over-month.", component: 'savings' });
  }

  if (breakdown.activity < 8) {
    tips.push({ text: "Log transactions daily — inactivity is hurting your score.", component: 'activity' });
  }

  if (tips.length === 0) {
    tips.push({ text: "Keep up the good work! Stay consistent with your goals.", component: 'general' });
  }

  return tips.slice(0, 3);
}

export function calculateHealthScore(params: HealthScoreParams): HealthScoreResult {
  // 1. Budget Score
  let budgetScore = 0;
  let budgetAdherence = 100;
  if (params.totalBudget > 0) {
    budgetAdherence = Math.max(0, 1 - params.totalSpent / params.totalBudget) * 100;
    budgetScore = Math.round((budgetAdherence / 100) * SCORE_WEIGHTS.budget);
  } else if (params.totalSpent === 0) {
    budgetScore = SCORE_WEIGHTS.budget;
    budgetAdherence = 100;
  }

  // 2. Savings Score
  const savingsRate = params.totalIncome > 0 ? (params.totalSavings / params.totalIncome) * 100 : 0;
  const needsPct = params.currentMonthExpenses > 0 ? (params.currentMonthNeeds / params.currentMonthExpenses) * 100 : 0;
  const wantsPct = params.currentMonthExpenses > 0 ? (params.currentMonthWants / params.currentMonthExpenses) * 100 : 0;

  let savingsScore = 0;
  if (savingsRate >= 20) savingsScore += 15;
  else if (savingsRate >= 10) savingsScore += 10;
  else if (savingsRate >= 5) savingsScore += 5;

  const needsGood = needsPct <= 55 && needsPct >= 45;
  const wantsGood = wantsPct <= 35 && wantsPct >= 25;
  if (needsGood && wantsGood && savingsRate >= 15) savingsScore += 15;
  else if (needsPct <= 60 && wantsPct <= 40) savingsScore += 10;
  else if (needsPct > 65 || wantsPct > 45) savingsScore += 0;
  else savingsScore += 5;

  savingsScore = Math.min(SCORE_WEIGHTS.savings, savingsScore);
  let rule502030: 'good' | 'warning' | 'bad' = 'good';
  if (needsPct > 60 || wantsPct > 40 || savingsRate < 10) rule502030 = 'bad';
  else if (needsPct > 55 || wantsPct > 35 || savingsRate < 15) rule502030 = 'warning';

  // 3. Trends Score
  const expenseGrowthRate = params.previousMonthExpenses > 0
    ? ((params.currentMonthExpenses - params.previousMonthExpenses) / params.previousMonthExpenses) * 100
    : 0;
  let trendsScore = SCORE_WEIGHTS.trends;
  if (expenseGrowthRate > 30) trendsScore -= 10;
  else if (expenseGrowthRate > 20) trendsScore -= 7;
  else if (expenseGrowthRate > 10) trendsScore -= 4;
  else if (expenseGrowthRate > 5) trendsScore -= 2;
  trendsScore = Math.max(0, trendsScore);
  const hasSpendCreep = expenseGrowthRate > 10;

  // 4. Activity Score
  let activityScore = SCORE_WEIGHTS.activity;
  if (params.lastActiveAt) {
    const daysInactive = Math.abs(differenceInDays(new Date(), parseISO(params.lastActiveAt)));
    activityScore = Math.max(0, SCORE_WEIGHTS.activity - daysInactive * 2);
  }
  const txnsPerDay = params.daysInMonth > 0 ? params.transactionsThisMonth / params.daysInMonth : 0;
  if (txnsPerDay >= 1) activityScore = Math.min(SCORE_WEIGHTS.activity, activityScore + 2);
  else if (txnsPerDay >= 0.5) activityScore = Math.min(SCORE_WEIGHTS.activity, activityScore + 1);

  // 5. Accuracy Score
  const variancePct = params.totalBudget > 0
    ? Math.abs(params.totalSpent - params.totalBudget) / params.totalBudget * 100
    : 0;
  let accuracyScore = SCORE_WEIGHTS.accuracy;
  if (variancePct > 30) accuracyScore -= 6;
  else if (variancePct > 20) accuracyScore -= 4;
  else if (variancePct > 10) accuracyScore -= 2;
  else if (variancePct <= 5) accuracyScore += 2;
  accuracyScore = Math.max(0, Math.min(SCORE_WEIGHTS.accuracy, accuracyScore));

  // Total
  const total = Math.max(0, Math.min(100,
    budgetScore + savingsScore + trendsScore + activityScore + accuracyScore
  ));

  // Top category - with explicit empty array fallback
  let topCategoryId: string | null = null;
  let topCategoryAmount = 0;
  const safeArray = Array.isArray(params.spendingByCategory) ? params.spendingByCategory : [];
  for (const cat of safeArray) {
    if (cat && typeof cat.amount === 'number' && cat.amount > topCategoryAmount) {
      topCategoryAmount = cat.amount;
      topCategoryId = cat.categoryId;
    }
  }

  // Insight
  let insightKey = 'healthScore.insightSetGoal';
  let insightParams: Record<string, string> = {};

  if (params.completedGoalsCount > 0 && params.latestCompletedGoalName) {
    insightKey = 'healthScore.insightCompletedGoal';
    insightParams = { goalName: params.latestCompletedGoalName };
  } else if (hasSpendCreep) {
    insightKey = 'healthScore.insightSpendCreep';
    insightParams = { rate: expenseGrowthRate.toFixed(1) + '%' };
  } else if (budgetAdherence <= 20) {
    insightKey = 'healthScore.insightBudgetAlert';
    insightParams = { pct: (100 - budgetAdherence).toFixed(0) + '%' };
    } else if (rule502030 === 'bad') {
      insightKey = 'healthScore.insightRule502030';
    insightParams = { needs: needsPct.toFixed(0) + '%', savings: savingsRate.toFixed(0) + '%' };
  } else if (params.hasActiveGoal && params.anyBehindThisPeriod && params.atRiskGoalName) {
    insightKey = 'healthScore.insightBehind';
    insightParams = { goalName: params.atRiskGoalName, required: params.atRiskGoalRequiredLabel || '' };
  } else if (params.anyGoalOnTrack && params.onTrackGoalName) {
    insightKey = 'healthScore.insightOnTrack';
    insightParams = { goalName: params.onTrackGoalName };
  } else if (savingsRate < 10 && params.totalIncome > 0) {
    insightKey = 'healthScore.insightLowSavings';
    insightParams = { rate: savingsRate.toFixed(1) + '%' };
  } else if (params.hasActiveGoal) {
    insightKey = 'healthScore.insightKeepContributing';
  }

  return {
    total,
    breakdown: {
      budget: budgetScore,
      savings: savingsScore,
      trends: trendsScore,
      activity: activityScore,
      accuracy: accuracyScore,
    },
    metrics: {
      savingsRate,
      budgetAdherence,
      expenseGrowthRate,
      topSpendingCategory: topCategoryId,
      needsPercentage: needsPct,
      wantsPercentage: wantsPct,
    },
    insightKey,
    insightParams,
  };
}
