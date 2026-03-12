import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInDays, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCurrency } from './useCurrency';
import type { Transaction } from '@/types';
import {
  buildMissedSavingsMonths,
  buildMissedSavingsPeriods,
  calculateSavingsPace,
  getAverageMonthlyContribution,
  getCompletionLabel,
  getGoalProjectedMonthlyPace,
  getMonthsToTarget,
  getSavingsNetAmount,
  recordBudgetLeftoverTransfer,
  recordSavingsContribution,
  recordSavingsReturn,
  redeploySavingsBetweenGoals,
  type SavingsPaceStatus,
  type SavingsPlanFrequency,
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
  plan_frequency: SavingsPlanFrequency | null;
  plan_start_date: string | null;
  auto_remind: boolean;
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
  status: SavingsPaceStatus;
  paceStatus: SavingsPaceStatus;
  isArchived: boolean;
  isUrgent: boolean;
  planEnabled: boolean;
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
  requiredPerPeriod: number;
  periodsRemaining: number;
  currentPace: number;
  currentPeriodAmount: number;
  periodLabel: 'day' | 'week' | 'month';
  periodLabelPlural: 'days' | 'weeks' | 'months';
  requiredThisPeriodLabel: string | null;
  suggestedDeadline: string | null;
  suggestedDeadlineLabel: string | null;
  sparkline: Array<{
    key: string;
    label: string;
    amount: number;
    target: number;
    isCurrent: boolean;
    isMissed: boolean;
  }>;
  isOnPaceThisPeriod: boolean;
  isBehindThisPeriod: boolean;
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

  const syncGoalReminderById = useCallback(async (goalId: string, options?: { removeOnly?: boolean }) => {
    if (!user?.id) {
      return;
    }

    const existingReminder = await supabase
      .from('payment_reminders')
      .select('id, due_date')
      .eq('user_id', user.id)
      .eq('savings_goal_id', goalId)
      .limit(1)
      .maybeSingle();

    if (options?.removeOnly) {
      if (existingReminder.data?.id) {
        await supabase.from('payment_reminders').delete().eq('id', existingReminder.data.id);
      }
      return;
    }

    const goalResult = await supabase
      .from('savings_goals')
      .select('*')
      .eq('id', goalId)
      .maybeSingle();

    if (goalResult.error) {
      throw goalResult.error;
    }

    const goal = goalResult.data as SavingsGoal | null;
    if (!goal) {
      if (existingReminder.data?.id) {
        await supabase.from('payment_reminders').delete().eq('id', existingReminder.data.id);
      }
      return;
    }

    const shouldHaveReminder = !goal.archived_at && (
      (goal.plan_frequency && goal.auto_remind) ||
      (goal.auto_contribute_enabled && goal.auto_contribute_frequency)
    );

    if (!shouldHaveReminder) {
      if (existingReminder.data?.id) {
        await supabase.from('payment_reminders').delete().eq('id', existingReminder.data.id);
      }
      return;
    }

    const transactionsResult = await supabase
      .from('transactions')
      .select('amount, amount_converted, date, category:categories(name)')
      .eq('user_id', user.id)
      .eq('savings_goal_id', goal.id)
      .order('date', { ascending: true });

    if (transactionsResult.error) {
      throw transactionsResult.error;
    }

    const contributionHistory = ((transactionsResult.data || []) as Array<{
      amount: number;
      amount_converted: number | null;
      date: string;
      category?: { name?: string } | null;
    }>)
      .filter((entry) => entry.category?.name === 'Savings')
      .map((entry) => ({
        amount: Number(entry.amount_converted || entry.amount),
        date: entry.date,
      }));

    const currentSaved = contributionHistory.reduce((sum, entry) => sum + entry.amount, 0);
    const pace = calculateSavingsPace({
      target_amount: goal.target_amount,
      current_saved: currentSaved,
      deadline: goal.deadline,
      created_at: goal.created_at,
      completed_at: goal.completed_at,
      plan_frequency: goal.plan_frequency,
      plan_start_date: goal.plan_start_date,
      contribution_history: contributionHistory,
    });

    const reminderAmount = goal.auto_contribute_enabled
      ? Number(goal.auto_contribute_amount ?? pace.required_per_period)
      : Number(pace.required_per_period);
    const recurringInterval = goal.auto_contribute_enabled
      ? (goal.auto_contribute_frequency || goal.plan_frequency)
      : goal.plan_frequency;

    if (!recurringInterval || reminderAmount <= 0) {
      if (existingReminder.data?.id) {
        await supabase.from('payment_reminders').delete().eq('id', existingReminder.data.id);
      }
      return;
    }

    const dueDate = existingReminder.data?.due_date
      || new Date(goal.plan_start_date || goal.created_at).toISOString();

    const payload = {
      user_id: user.id,
      title: `Savings: ${goal.name}`,
      amount: reminderAmount,
      currency,
      due_date: dueDate,
      is_recurring: true,
      recurring_interval: recurringInterval,
      notify_before_days: 0,
      status: 'upcoming',
      savings_goal_id: goal.id,
      note: `Savings plan reminder for ${goal.name}`,
    };

    if (existingReminder.data?.id) {
      const { error } = await supabase.from('payment_reminders').update(payload).eq('id', existingReminder.data.id);
      if (error) {
        throw error;
      }
      return;
    }

    const { error } = await supabase.from('payment_reminders').insert(payload);
    if (error) {
      throw error;
    }
  }, [currency, user?.id]);

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

        const savingsOnlyHistory = contributionHistory
          .filter((entry) => entry.type === 'contribution')
          .map((entry) => ({ amount: entry.amount, date: entry.date }));

        const pace = calculateSavingsPace({
          target_amount: goal.target_amount,
          current_saved: currentAmount,
          deadline: goal.deadline,
          created_at: goal.created_at,
          completed_at: goal.completed_at,
          plan_frequency: goal.plan_frequency,
          plan_start_date: goal.plan_start_date,
          contribution_history: savingsOnlyHistory,
        });

        const monthStart = startOfMonth(new Date());
        const thisMonthContribution = savingsOnlyHistory
          .filter((entry) => new Date(entry.date) >= monthStart)
          .reduce((sum, entry) => sum + entry.amount, 0);

        const monthlyPace = getGoalProjectedMonthlyPace(savingsOnlyHistory);
        const missedMonths = goal.plan_frequency
          ? buildMissedSavingsPeriods({
              contributionHistory: savingsOnlyHistory,
              frequency: goal.plan_frequency,
              startDate: goal.plan_start_date || goal.created_at,
            })
          : buildMissedSavingsMonths({
              contributionHistory: savingsOnlyHistory,
              autoContributeEnabled: goal.auto_contribute_enabled,
              autoContributeFrequency: goal.auto_contribute_frequency,
              createdAt: goal.created_at,
            });

        const planEnabled = Boolean(goal.plan_frequency);
        const isOnPaceThisPeriod = planEnabled && pace.required_per_period > 0
          ? pace.current_period_amount >= pace.required_per_period * 0.95
          : false;
        const isBehindThisPeriod = planEnabled && pace.required_per_period > 0
          ? pace.current_period_amount < pace.required_per_period * 0.95
          : false;

        return {
          ...goal,
          current_amount: currentAmount,
          percentage,
          remaining,
          daysLeft,
          status: pace.status,
          paceStatus: pace.status,
          isArchived: goal.archived_at !== null,
          isUrgent: daysLeft !== null && daysLeft <= 7 && daysLeft >= 0,
          planEnabled,
          contributionHistory,
          thisMonthContribution,
          projectedCompletionDate: pace.suggested_deadline,
          projectedCompletionLabel: getCompletionLabel(pace.suggested_deadline),
          monthlyPace,
          averageMonthlyContribution: getAverageMonthlyContribution(savingsOnlyHistory, goal.created_at),
          monthsToTarget: getMonthsToTarget(currentAmount, goal.target_amount, monthlyPace),
          missedMonths,
          hasContributedThisMonth: thisMonthContribution > 0,
          availableToRedeploy: currentAmount,
          requiredPerPeriod: pace.required_per_period,
          periodsRemaining: pace.periods_remaining,
          currentPace: pace.current_pace,
          currentPeriodAmount: pace.current_period_amount,
          periodLabel: pace.period_label,
          periodLabelPlural: pace.period_label_plural,
          requiredThisPeriodLabel: planEnabled && pace.required_per_period > 0
            ? `${pace.required_per_period.toFixed(2)} due this ${pace.period_label}`
            : null,
          suggestedDeadline: pace.suggested_deadline,
          suggestedDeadlineLabel: getCompletionLabel(pace.suggested_deadline),
          sparkline: pace.sparkline,
          isOnPaceThisPeriod,
          isBehindThisPeriod,
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
          plan_frequency: goal.plan_frequency ?? null,
          plan_start_date: goal.plan_start_date ?? null,
          auto_remind: goal.auto_remind ?? false,
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

      await syncGoalReminderById(data.id);
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

      await syncGoalReminderById(id);
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

      if (goal.current_amount + amount >= goal.target_amount && !goal.completed_at) {
        await markGoalCompleted(goal.id);
      }

      await syncGoalReminderById(goal.id);
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

      await syncGoalReminderById(id, { removeOnly: true });
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

      await supabase.from('savings_goals').update({ archived_at: new Date().toISOString() }).eq('id', goal.id);
      await syncGoalReminderById(goal.id, { removeOnly: true });
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

      await supabase.from('savings_goals').update({ archived_at: new Date().toISOString() }).eq('id', sourceGoalId);

      if (destinationGoal.current_amount + amount >= destinationGoal.target_amount && !destinationGoal.completed_at) {
        await markGoalCompleted(destinationGoal.id);
      }

      await Promise.all([
        syncGoalReminderById(sourceGoalId, { removeOnly: true }),
        syncGoalReminderById(destinationGoalId),
      ]);
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

      await syncGoalReminderById(goal.id);
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
      await syncGoalReminderById(id, { removeOnly: true });
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
    .sort((a, b) => {
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return a.created_at.localeCompare(b.created_at);
    })
    .slice(0, 2);
  const totalSaved = activeGoals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const totalTarget = activeGoals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const completedGoalEntries = goals.filter((goal) => goal.completed_at !== null || goal.current_amount >= goal.target_amount);
  const completedGoals = completedGoalEntries.length;
  const anyGoalOnTrack = activeGoals.some((goal) => goal.paceStatus === 'on_track' || goal.paceStatus === 'ahead');
  const anyAutoContributeEnabled = activeGoals.some((goal) => goal.auto_contribute_enabled);
  const anyPlanEnabled = activeGoals.some((goal) => goal.planEnabled);
  const anyOnPaceThisPeriod = activeGoals.some((goal) => goal.isOnPaceThisPeriod);
  const anyBehindThisPeriod = activeGoals.some((goal) => goal.isBehindThisPeriod);
  const behindGoal = activeGoals.find((goal) => goal.isBehindThisPeriod) || null;
  const overdueWithoutContribution = activeGoals.some((goal) => {
    if (!goal.deadline) {
      return false;
    }

    return new Date(goal.deadline) < new Date() && !goal.hasContributedThisMonth;
  });
  const latestCompletedGoal = completedGoalEntries
    .sort((a, b) => new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime())[0] || null;

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
    anyPlanEnabled,
    anyOnPaceThisPeriod,
    anyBehindThisPeriod,
    behindGoal,
    latestCompletedGoal,
    overdueWithoutContribution,
  };
}
