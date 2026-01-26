import { differenceInDays, parseISO } from 'date-fns';

interface HealthScoreParams {
    totalSpent: number;
    totalBudget: number;
    currentSavings: number;
    targetSavings: number;
    lastActiveAt: string | null;
}

export interface HealthScoreResult {
    total: number;
    breakdown: {
        budget: number;
        savings: number;
        activity: number;
    };
}

export function calculateHealthScore({
    totalSpent,
    totalBudget,
    currentSavings,
    targetSavings,
    lastActiveAt,
}: HealthScoreParams): HealthScoreResult {
    // 1. Budget Adherence Score (40%)
    // Logic: 100 - (spent/budget * 100)
    let budgetScore = 0;
    if (totalBudget > 0) {
        budgetScore = Math.max(0, 100 - (totalSpent / totalBudget) * 100);
    } else if (totalSpent === 0) {
        budgetScore = 100; // No budget and no spending is perfect control
    } else {
        budgetScore = 0; // Spending without a budget is 0 control
    }

    // 2. Savings Progress Score (30%)
    // Logic: (current/target) * 100
    let savingsScore = 0;
    if (targetSavings > 0) {
        savingsScore = Math.min(100, (currentSavings / targetSavings) * 100);
    } else {
        savingsScore = 100; // No goals means you "completed" your non-existent goals or it's neutral. 
        // Let's assume 100 to not penalize people without goals in this specific metric.
    }

    // 3. Activity Score (30%)
    // Logic: 100 - (days_inactive * 10)
    let activityScore = 0;
    if (lastActiveAt) {
        const lastActiveDate = parseISO(lastActiveAt);
        const daysInactive = Math.abs(differenceInDays(new Date(), lastActiveDate));
        activityScore = Math.max(0, 100 - daysInactive * 10);
    }

    const weightedBudget = budgetScore * 0.4;
    const weightedSavings = savingsScore * 0.3;
    const weightedActivity = activityScore * 0.3;

    return {
        total: Math.round(weightedBudget + weightedSavings + weightedActivity),
        breakdown: {
            budget: Math.round(budgetScore),
            savings: Math.round(savingsScore),
            activity: Math.round(activityScore),
        },
    };
}
