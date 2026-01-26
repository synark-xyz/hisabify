import { useMemo } from 'react';
import { useBudgets } from '@/hooks/useBudgets';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useProfile } from '@/hooks/useProfile';
import { calculateHealthScore, HealthScoreResult } from '../utils/healthScoreLogic';

export function useHealthScore(): { score: HealthScoreResult | null; loading: boolean } {
    const { budgets, loading: budgetsLoading } = useBudgets();
    const { goals, isLoading: goalsLoading } = useSavingsGoals();
    const { profile, loading: profileLoading } = useProfile();

    const score = useMemo(() => {
        if (budgetsLoading || goalsLoading || profileLoading) return null;

        // Use monthly budgets for the score
        const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
        const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

        // Savings goals are usually long-term, so we aggregate current vs target
        const totalTargetSavings = goals.reduce((sum, g) => sum + g.target_amount, 0);
        const totalCurrentSavings = goals.reduce((sum, g) => sum + g.current_amount, 0);

        return calculateHealthScore({
            totalSpent,
            totalBudget,
            currentSavings: totalCurrentSavings,
            targetSavings: totalTargetSavings,
            lastActiveAt: profile.last_active_at,
        });
    }, [budgets, goals, profile, budgetsLoading, goalsLoading, profileLoading]);

    return {
        score,
        loading: budgetsLoading || goalsLoading || profileLoading,
    };
}
