import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBudgets } from '@/hooks/useBudgets';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useProfile } from '@/hooks/useProfile';
import { useTransactionUpdateListener } from '@/hooks/useTransactionUpdateListener';
import { calculateHealthScore, HealthScoreResult } from '../utils/healthScoreLogic';

export function useHealthScore(): { score: HealthScoreResult | null; loading: boolean } {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const { activeGoals, goals, isLoading: goalsLoading, anyGoalOnTrack, anyAutoContributeEnabled, overdueWithoutContribution } = useSavingsGoals();
  const { profile, loading: profileLoading } = useProfile();

  const { data: transferredBudgetLeftoverThisMonth = false, isLoading: transferLoading } = useQuery({
    queryKey: ['health-score-budget-transfer', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return false;
      }

      const { count, error } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'income')
        .not('budget_id', 'is', null)
        .not('savings_goal_id', 'is', null)
        .gte('date', startOfMonth(new Date()).toISOString());

      if (error) {
        throw error;
      }

      return (count || 0) > 0;
    },
    enabled: !!user?.id,
  });

  useTransactionUpdateListener(() => {
    queryClient.invalidateQueries({ queryKey: ['health-score-budget-transfer', user?.id] });
  });

  const score = useMemo(() => {
    if (budgetsLoading || goalsLoading || profileLoading || transferLoading) {
      return null;
    }

    const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    const hasSavingsContributionThisMonth = goals.some((goal) => goal.hasContributedThisMonth);
    const atRiskGoal = activeGoals.find((goal) => goal.status === 'behind' || goal.status === 'at_risk') || null;
    const onTrackGoal = activeGoals.find((goal) => goal.status === 'on_track') || null;

    return calculateHealthScore({
      totalSpent,
      totalBudget,
      hasActiveGoal: activeGoals.length > 0,
      anyGoalOnTrack,
      hasSavingsContributionThisMonth,
      completedGoalsCount: goals.filter((goal) => goal.completed_at || goal.current_amount >= goal.target_amount).length,
      anyAutoContributeEnabled,
      overdueWithoutContribution,
      transferredBudgetLeftoverThisMonth,
      atRiskGoalName: atRiskGoal?.name || null,
      onTrackGoalName: onTrackGoal?.name || null,
      lastActiveAt: profile.last_active_at,
    });
  }, [
    activeGoals,
    anyAutoContributeEnabled,
    anyGoalOnTrack,
    budgets,
    budgetsLoading,
    goals,
    goalsLoading,
    overdueWithoutContribution,
    profile.last_active_at,
    profileLoading,
    transferLoading,
    transferredBudgetLeftoverThisMonth,
  ]);

  return {
    score,
    loading: budgetsLoading || goalsLoading || profileLoading || transferLoading,
  };
}
