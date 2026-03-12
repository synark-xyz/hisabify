import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInDays, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCurrency } from './useCurrency';
import type { Transaction } from '@/types';
import {
  buildMissedSavingsMonths,
  getAverageMonthlyContribution,
  getCompletionLabel,
  getGoalProjectedMonthlyPace,
  getMonthsToTarget,
  getSavingsNetAmount,
  getSavingsPaceStatus,
  projectSavingsCompletionDate,
  recordBudgetLeftoverTransfer,
  recordSavingsContribution,
  recordSavingsReturn,
  redeploySavingsBetweenGoals,
} from '@/lib/savings';

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  completed_at: string | null;
  linked_budget_id: string | null;
  reserve_amount: number;
  auto_contribute_enabled: boolean;
  auto_contribute_amount: number | null;
  auto_contribute_frequency: 'weekly' | 'monthly' | null;
}

export interface SavingsContribution {
  id: string;
  amount: number;
  date: string;
  type: 'contribution' | 'withdrawal';
  note: string | null;
  runningTotal: number;
}

export interface SavingsGoalWithProgress extends SavingsGoal {
  percentage: number;
  remaining: number;
  daysLeft: number | null;
  status: 'on_track' | 'behind' | 'completed' | 'at_risk';
  isArchived: boolean;
  isUrgent: boolean;
  contributionHistory: SavingsContribution[];
  thisMonthContribution: number;
  projectedCompletionDate: string | null;
  projectedCompletionLabel: string | null;
  monthlyPace: number;
  averageMonthlyContribution: number;
  monthsToTarget: number | null;
  missedMonths: string[];
  hasContributedThisMonth: boolean;
  availableToRedeploy: number;
}

async function upsertAutoContributionReminder(params: {
  userId: string;
  goal: Pick<SavingsGoal, 'id' | 'name'>;
  amount: number | null;
  frequency: 'weekly' | 'monthly' | null;
  enabled: boolean;
  currency: string;
}) {
  const existing = await supabase
    .from('payment_reminders')
    .select('id')
    .eq('user_id', params.userId)
    .eq('savings_goal_id', params.goal.id)
    .limit(1)
    .maybeSingle();

  if (!params.enabled || !params.amount || !params.frequency) {
    if (existing.data?.id) {
      await supabase.from('payment_reminders').delete().eq('id', existing.data.id);
    }
    return;
  }

  const payload = {
    user_id: params.userId,
    title: `Savings: ${params.goal.name}`,
    amount: params.amount,
    currency: params.currency,
    due_date: new Date().toISOString(),
    is_recurring: true,
    recurring_interval: params.frequency,
    notify_before_days: 0,
    status: 'upcoming',
    savings_goal_id: params.goal.id,
    note: `Auto-contribute for ${params.goal.name}`,
  };

  if (existing.data?.id) {
    const { error } = await supabase.from('payment_reminders').update(payload).eq('id', existing.data.id);
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from('payment_reminders').insert(payload);
  if (error) {
    throw error;
  }
}

async function markGoalCompleted(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('savings_goals')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', goalId)
    .is('completed_at', null);

  if (error) {
    throw error;
  }
}

export function useSavingsGoals() {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading, refetch } = useQuery({
    queryKey: ['savings-goals', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const [goalsResult, transactionsResult] = await Promise.all([
        supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('transactions')
          .select('*, category:categories(*)')
          .eq('user_id', user.id)
          .not('savings_goal_id', 'is', null)
          .order('date', { ascending: true }),
      ]);

      if (goalsResult.error) {
        throw goalsResult.error;
      }

      if (transactionsResult.error) {
        throw transactionsResult.error;
      }

      const transactions = (transactionsResult.data || []) as unknown as Transaction[];

      return (goalsResult.data || []).map((goal): SavingsGoalWithProgress => {
        const goalTransactions = transactions.filter((tx) => tx.savings_goal_id === goal.id);
        const netAmount = getSavingsNetAmount(goalTransactions);
        const currentAmount = Math.max(netAmount, 0);
        const percentage = Math.min(Math.round((currentAmount / goal.target_amount) * 100), 100);
        const remaining = Math.max(goal.target_amount - currentAmount, 0);
        const daysLeft = goal.deadline ? differenceInDays(new Date(goal.deadline), new Date()) : null;
        const status = getSavingsPaceStatus({
          savedAmount: currentAmount,
          targetAmount: goal.target_amount,
          createdAt: goal.created_at,
          deadline: goal.deadline,
          completedAt: goal.completed_at,
        });

        let runningTotal = 0;
        const contributionHistory = goalTransactions
          .filter((tx) => tx.category?.name === 'Savings' || tx.category?.name === 'Savings Return')
          .map((tx) => {
            const amount = Number(tx.amount_converted || tx.amount);
            const isContribution = tx.category?.name === 'Savings';
            runningTotal += isContribution ? amount : -amount;

            return {
              id: tx.id,
              amount,
              date: tx.date,
              type: isContribution ? 'contribution' : 'withdrawal',
              note: tx.note,
              runningTotal,
            } satisfies SavingsContribution;
          });

        const monthStart = startOfMonth(new Date());
        const thisMonthContribution = contributionHistory
          .filter((entry) => entry.type === 'contribution' && new Date(entry.date) >= monthStart)
          .reduce((sum, entry) => sum + entry.amount, 0);
        const monthlyPace = getGoalProjectedMonthlyPace(
          contributionHistory
            .filter((entry) => entry.type === 'contribution')
            .map((entry) => ({ amount: entry.amount, date: entry.date }))
        );
        const projectedCompletionDate = projectSavingsCompletionDate({
          savedAmount: currentAmount,
          targetAmount: goal.target_amount,
          contributionHistory: contributionHistory
            .filter((entry) => entry.type === 'contribution')
            .map((entry) => ({ amount: entry.amount, date: entry.date })),
          fallbackDate: goal.deadline,
        });
        const missedMonths = buildMissedSavingsMonths({
          contributionHistory: contributionHistory
            .filter((entry) => entry.type === 'contribution')
            .map((entry) => ({ amount: entry.amount, date: entry.date })),
          autoContributeEnabled: goal.auto_contribute_enabled,
          autoContributeFrequency: goal.auto_contribute_frequency,
          createdAt: goal.created_at,
        });

        return {
          ...goal,
          current_amount: currentAmount,
          percentage,
          remaining,
          daysLeft,
          status,
          isArchived: goal.archived_at !== null,
          isUrgent: daysLeft !== null && daysLeft <= 7 && daysLeft >= 0,
          contributionHistory,
          thisMonthContribution,
          projectedCompletionDate,
          projectedCompletionLabel: getCompletionLabel(projectedCompletionDate),
          monthlyPace,
          averageMonthlyContribution: getAverageMonthlyContribution(
            contributionHistory.filter((entry) => entry.type === 'contribution').map((entry) => ({
              amount: entry.amount,
              date: entry.date,
            })),
            goal.created_at
          ),
          monthsToTarget: getMonthsToTarget(currentAmount, goal.target_amount, monthlyPace),
          missedMonths,
          hasContributedThisMonth: thisMonthContribution > 0,
          availableToRedeploy: currentAmount,
        };
      });
    },
    enabled: !!user?.id,
  });

  const createGoal = useMutation({
    mutationFn: async (goal: Omit<SavingsGoal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_amount' | 'archived_at' | 'completed_at'> & { initial_amount?: number }) => {
      if (!user?.id) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('savings_goals')
        .insert({
          user_id: user.id,
          name: goal.name,
          target_amount: goal.target_amount,
          current_amount: 0,
          deadline: goal.deadline,
          color: goal.color,
          icon: goal.icon,
          linked_budget_id: goal.linked_budget_id ?? null,
          reserve_amount: goal.reserve_amount ?? 0,
          auto_contribute_enabled: goal.auto_contribute_enabled ?? false,
          auto_contribute_amount: goal.auto_contribute_amount ?? null,
          auto_contribute_frequency: goal.auto_contribute_frequency ?? null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (goal.initial_amount && goal.initial_amount > 0) {
        await recordSavingsContribution({
          userId: user.id,
          goalId: data.id,
          goalName: data.name,
          amount: goal.initial_amount,
          currency,
          note: data.name,
        });
      }

      await upsertAutoContributionReminder({
        userId: user.id,
        goal: { id: data.id, name: data.name },
        amount: goal.auto_contribute_amount ?? null,
        frequency: goal.auto_contribute_frequency ?? null,
        enabled: goal.auto_contribute_enabled ?? false,
        currency,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Savings goal created!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create goal: ${error.message}`);
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, initial_amount: _initialAmount, ...updates }: Partial<SavingsGoal> & { id: string; initial_amount?: number }) => {
      const { data, error } = await supabase
        .from('savings_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!user?.id) {
        throw new Error('Not authenticated');
      }

      await upsertAutoContributionReminder({
        userId: user.id,
        goal: { id: data.id, name: data.name },
        amount: data.auto_contribute_amount,
        frequency: data.auto_contribute_frequency as 'weekly' | 'monthly' | null,
        enabled: data.auto_contribute_enabled,
        currency,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Goal updated!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update goal: ${error.message}`);
    },
  });

  const addToGoal = useMutation({
    mutationFn: async ({ id, amount, budgetId }: { id: string; amount: number; budgetId?: string | null }) => {
      if (!user?.id) {
        throw new Error('Not authenticated');
      }

      const goal = goals.find((entry) => entry.id === id);
      if (!goal) {
        throw new Error('Goal not found');
      }

      await recordSavingsContribution({
        userId: user.id,
        goalId: goal.id,
        goalName: goal.name,
        amount,
        currency,
        budgetId: budgetId ?? goal.linked_budget_id ?? null,
      });

      const projectedTotal = goal.current_amount + amount;
      if (projectedTotal >= goal.target_amount && !goal.completed_at) {
        await markGoalCompleted(goal.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add funds: ${error.message}`);
    },
  });

  const archiveGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('savings_goals')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Goal archived');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive goal: ${error.message}`);
    },
  });

  const redeployToBalance = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      if (!user?.id) {
        throw new Error('Not authenticated');
      }

      const goal = goals.find((entry) => entry.id === id);
      if (!goal) {
        throw new Error('Goal not found');
      }

      await recordSavingsReturn({
        userId: user.id,
        goalId: goal.id,
        goalName: goal.name,
        amount,
        currency,
      });

      await supabase
        .from('savings_goals')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', goal.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Savings returned to your main balance');
    },
    onError: (error: Error) => {
      toast.error(`Failed to redeploy funds: ${error.message}`);
    },
  });

  const redeployToGoal = useMutation({
    mutationFn: async ({ sourceGoalId, destinationGoalId, amount }: { sourceGoalId: string; destinationGoalId: string; amount: number }) => {
      if (!user?.id) {
        throw new Error('Not authenticated');
      }

      const sourceGoal = goals.find((entry) => entry.id === sourceGoalId);
      const destinationGoal = goals.find((entry) => entry.id === destinationGoalId);
      if (!sourceGoal || !destinationGoal) {
        throw new Error('Goal not found');
      }

      await redeploySavingsBetweenGoals({
        userId: user.id,
        sourceGoalId,
        sourceGoalName: sourceGoal.name,
        destinationGoalId,
        destinationGoalName: destinationGoal.name,
        amount,
        currency,
      });

      await supabase
        .from('savings_goals')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', sourceGoalId);

      if (destinationGoal.current_amount + amount >= destinationGoal.target_amount && !destinationGoal.completed_at) {
        await markGoalCompleted(destinationGoal.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Funds redeployed to another goal');
    },
    onError: (error: Error) => {
      toast.error(`Failed to redeploy funds: ${error.message}`);
    },
  });

  const transferBudgetLeftover = useMutation({
    mutationFn: async ({
      budgetId,
      budgetName,
      budgetCategoryId,
      goalId,
      amount,
    }: {
      budgetId: string;
      budgetName: string;
      budgetCategoryId: string | null;
      goalId: string;
      amount: number;
    }) => {
      if (!user?.id) {
        throw new Error('Not authenticated');
      }

      const goal = goals.find((entry) => entry.id === goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }

      await recordBudgetLeftoverTransfer({
        userId: user.id,
        budgetId,
        budgetName,
        budgetCategoryId,
        goalId,
        goalName: goal.name,
        amount,
        currency,
      });

      if (goal.current_amount + amount >= goal.target_amount && !goal.completed_at) {
        await markGoalCompleted(goal.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Budget leftover moved to savings');
    },
    onError: (error: Error) => {
      toast.error(`Failed to transfer budget leftover: ${error.message}`);
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Goal deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete goal: ${error.message}`);
    },
  });

  const activeGoals = goals.filter((goal) => !goal.isArchived);
  const topActiveGoals = activeGoals
    .filter((goal) => goal.status !== 'completed')
    .sort((a, b) => b.current_amount - a.current_amount)
    .slice(0, 2);
  const totalSaved = activeGoals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const totalTarget = activeGoals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const completedGoals = goals.filter((goal) => goal.completed_at !== null || goal.current_amount >= goal.target_amount).length;
  const anyGoalOnTrack = activeGoals.some((goal) => goal.status === 'on_track');
  const anyAutoContributeEnabled = activeGoals.some((goal) => goal.auto_contribute_enabled);
  const overdueWithoutContribution = activeGoals.some((goal) => {
    if (!goal.deadline) {
      return false;
    }

    return new Date(goal.deadline) < new Date() && !goal.hasContributedThisMonth;
  });

  return {
    goals,
    activeGoals,
    topActiveGoals,
    isLoading,
    refetch,
    createGoal,
    updateGoal,
    addToGoal,
    archiveGoal,
    redeployToBalance,
    redeployToGoal,
    transferBudgetLeftover,
    deleteGoal,
    totalSaved,
    totalTarget,
    completedGoals,
    anyGoalOnTrack,
    anyAutoContributeEnabled,
    overdueWithoutContribution,
  };
}
