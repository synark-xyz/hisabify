import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, subMonths, getDaysInMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBudgets } from '@/hooks/useBudgets';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useProfile } from '@/hooks/useProfile';
import { calculateHealthScore, HealthScoreResult } from '../utils/healthScoreLogic';

interface TransactionRow {
  amount: number | string;
  type: string;
  category_id: string | null;
  currency_base?: string | null;
}

interface MonthlyDataResult {
  currentTxns: TransactionRow[];
  prevTxns: TransactionRow[];
  savingsTxns: TransactionRow[];
  transferredBudgetLeftoverThisMonth: boolean;
  daysInMonth: number;
}

export function useHealthScore(): { score: HealthScoreResult | null; loading: boolean } {
  const { user } = useAuth();
  const { budgets, loading: budgetsLoading } = useBudgets();
  const {
    activeGoals,
    goals,
    isLoading: goalsLoading,
    anyGoalOnTrack,
    anyAutoContributeEnabled,
    anyPlanEnabled,
    anyOnPaceThisPeriod,
    anyBehindThisPeriod,
    behindGoal,
    latestCompletedGoal,
    overdueWithoutContribution,
  } = useSavingsGoals();
  const { profile, loading: profileLoading } = useProfile();

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery<MonthlyDataResult | null>({
    queryKey: ['health-score-monthly-data', user?.id],
    queryFn: async (): Promise<MonthlyDataResult> => {
      if (!user?.id) {
        return {
          currentTxns: [],
          prevTxns: [],
          savingsTxns: [],
          transferredBudgetLeftoverThisMonth: false,
          daysInMonth: 30,
        };
      }

      const monthStart = startOfMonth(new Date());
      const prevMonthStart = startOfMonth(subMonths(new Date(), 1));
      const daysInMonth = getDaysInMonth(new Date());

      // Get current month transactions
      const { data: currentTxns } = await supabase
        .from('transactions')
        .select('amount, type, category_id')
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString())
        .lt('date', new Date().toISOString());

      // Get previous month transactions
      const { data: prevTxns } = await supabase
        .from('transactions')
        .select('amount, type, category_id')
        .eq('user_id', user.id)
        .gte('date', prevMonthStart.toISOString())
        .lt('date', monthStart.toISOString());

      // Get savings contributions this month
      const { data: savingsTxns } = await supabase
        .from('transactions')
        .select('amount, type, category_id')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .not('savings_goal_id', 'is', null)
        .gte('date', monthStart.toISOString());

      // Get budget transfer info
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'income')
        .not('budget_id', 'is', null)
        .not('savings_goal_id', 'is', null)
        .gte('date', monthStart.toISOString());

      return {
        currentTxns: (currentTxns || []) as TransactionRow[],
        prevTxns: (prevTxns || []) as TransactionRow[],
        savingsTxns: (savingsTxns || []) as TransactionRow[],
        transferredBudgetLeftoverThisMonth: (count || 0) > 0,
        daysInMonth,
      };
    },
    enabled: !!user?.id,
  });

  const score = useMemo(() => {
    if (budgetsLoading || goalsLoading || profileLoading || monthlyLoading || !monthlyData) {
      return null;
    }

    const totalBudget = (budgets || []).reduce((sum, budget) => sum + budget.amount, 0);
    const totalSpent = (budgets || []).reduce((sum, budget) => sum + budget.spent, 0);

    // Calculate income from current month transactions
    const totalIncome = monthlyData.currentTxns
      .filter((txn) => txn.type === 'income')
      .reduce((sum, txn) => sum + Number(txn.amount), 0);

    // Total savings from goal contributions
    const totalSavings = monthlyData.savingsTxns
      .reduce((sum, txn) => sum + Number(txn.amount), 0);

    // Categorize expenses
    const currentMonthExpenses = monthlyData.currentTxns
      .filter((txn) => txn.type === 'expense')
      .reduce((sum, txn) => sum + Number(txn.amount), 0);

    const previousMonthExpenses = monthlyData.prevTxns
      .filter((txn) => txn.type === 'expense')
      .reduce((sum, txn) => sum + Number(txn.amount), 0);

    // Spending by category for creep detection
    const categoryMap = new Map<string | null, number>();
    monthlyData.currentTxns
      .filter((txn) => txn.type === 'expense')
      .forEach((txn) => {
        const catId = txn.category_id || null;
        categoryMap.set(catId, (categoryMap.get(catId) || 0) + Number(txn.amount));
      });

    const spendingByCategory = Array.from(categoryMap.entries()).map(([categoryId, amount]) => ({
      categoryId,
      amount,
    }));

    // Simplified: assume needs = 70% of expenses, wants = 30% discretionary
    const needsAmount = currentMonthExpenses * 0.7;
    const wantsAmount = currentMonthExpenses * 0.3;

    const onTrackGoal = activeGoals.find((goal) => goal.status === 'on_track' || goal.status === 'ahead') || null;

    return calculateHealthScore({
      totalSpent,
      totalBudget,
      totalIncome,
      totalSavings,
      hasActiveGoal: activeGoals.length > 0,
      anyGoalOnTrack,
      hasSavingsContributionThisMonth: monthlyData.savingsTxns.length > 0,
      completedGoalsCount: goals.filter((goal) => goal.completed_at || goal.current_amount >= goal.target_amount).length,
      anyAutoContributeEnabled,
      anyPlanEnabled,
      anyOnPaceThisPeriod,
      anyBehindThisPeriod,
      overdueWithoutContribution,
      transferredBudgetLeftoverThisMonth: monthlyData.transferredBudgetLeftoverThisMonth,
      atRiskGoalName: behindGoal?.name || null,
      atRiskGoalRequiredLabel: behindGoal ? `${behindGoal.requiredPerPeriod.toFixed(0)} needed` : null,
      onTrackGoalName: onTrackGoal?.name || null,
      latestCompletedGoalName: latestCompletedGoal?.name || null,
      lastActiveAt: profile.last_active_at,
      // New params for comprehensive calculation
      currentMonthExpenses,
      currentMonthNeeds: needsAmount,
      currentMonthWants: wantsAmount,
      previousMonthExpenses,
      spendingByCategory,
      transactionsThisMonth: monthlyData.currentTxns.length,
      daysInMonth: monthlyData.daysInMonth,
    });
  }, [
    activeGoals,
    anyAutoContributeEnabled,
    anyBehindThisPeriod,
    anyGoalOnTrack,
    anyOnPaceThisPeriod,
    anyPlanEnabled,
    behindGoal,
    budgets,
    budgetsLoading,
    goals,
    goalsLoading,
    latestCompletedGoal,
    monthlyData,
    monthlyLoading,
    overdueWithoutContribution,
    profile.last_active_at,
    profileLoading,
  ]);

  return {
    score,
    loading: budgetsLoading || goalsLoading || profileLoading || monthlyLoading,
  };
}
