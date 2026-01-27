import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, format } from 'date-fns';
import { Category } from '@/types';
import { showBudgetWarning, showBudgetExceeded } from '@/lib/notificationManager';

export type PeriodType = 'weekly' | 'monthly' | 'yearly';

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  category?: Category;
  amount: number;
  month: number;
  year: number;
  period_type: PeriodType;
  start_date: string | null;
  end_date: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetWithSpending extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  status: 'safe' | 'warning' | 'exceeded';
}

export interface CreateBudgetInput {
  category_id: string | null;
  amount: number;
  period_type: PeriodType;
  start_date?: Date;
  end_date?: Date;
  name?: string;
}

export interface UpdateBudgetInput extends Partial<CreateBudgetInput> {
  id: string;
}

// Notification manager now handles alert deduplication

export function useBudgets() {
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { convertAmount } = useExchangeRate();

  // Refs to prevent infinite loops and duplicate fetches
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const convertAmountRef = useRef(convertAmount);

  // Keep convertAmount ref up to date
  useEffect(() => {
    convertAmountRef.current = convertAmount;
  }, [convertAmount]);

  const getPeriodDates = (periodType: PeriodType, startDate?: Date): { start: Date; end: Date } => {
    const now = startDate || new Date();
    switch (periodType) {
      case 'weekly':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'yearly':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchBudgets = useCallback(async () => {
    if (!user) return;

    // Prevent duplicate fetches within 500ms
    const now = Date.now();
    if (isFetchingRef.current || (now - lastFetchRef.current) < 500) {
      return;
    }

    isFetchingRef.current = true;
    lastFetchRef.current = now;
    setLoading(true);
    setError(null);

    try {
      // Fetch budgets with categories
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (budgetsError) throw budgetsError;

      // Filter to current period budgets
      const now = new Date();
      const activeBudgets = (budgetsData || []).filter((budget) => {
        if (budget.start_date && budget.end_date) {
          return isWithinInterval(now, {
            start: new Date(budget.start_date),
            end: new Date(budget.end_date)
          });
        }
        // Legacy support: check month/year
        return budget.month === now.getMonth() + 1 && budget.year === now.getFullYear();
      });

      // Get spending for each budget
      const budgetsWithSpending = await Promise.all(
        activeBudgets.map(async (budget) => {
          const periodType = budget.period_type as PeriodType;
          const startDate = budget.start_date || getPeriodDates(periodType).start.toISOString();
          const endDate = budget.end_date || getPeriodDates(periodType).end.toISOString();

          let query = supabase
            .from('transactions')
            .select('amount, currency_base')
            .eq('user_id', user.id)
            .eq('type', 'expense')
            .gte('date', startDate)
            .lte('date', endDate);

          if (budget.category_id) {
            query = query.eq('category_id', budget.category_id);
          }

          const { data: transactions } = await query;

          // Convert and sum transactions
          let spent = 0;
          if (transactions) {
            for (const t of transactions) {
              const storedCurrency = t.currency_base || 'USD';
              if (storedCurrency === currency) {
                spent += Number(t.amount);
              } else {
                const result = await convertAmountRef.current(Number(t.amount), storedCurrency, currency);
                spent += result ? result.convertedAmount : Number(t.amount);
              }
            }
          }

          const remaining = Math.max(0, budget.amount - spent);
          const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

          let status: 'safe' | 'warning' | 'exceeded' = 'safe';
          if (percentage >= 100) {
            status = 'exceeded';
          } else if (percentage >= 80) {
            status = 'warning';
          }

          return {
            ...budget,
            spent,
            remaining,
            percentage,
            status
          } as BudgetWithSpending;
        })
      );

      setBudgets(budgetsWithSpending);

      // Show alerts for budgets at warning or exceeded levels
      // Alerts disabled per user request to avoid spam on tab open
      // budgetsWithSpending.forEach((budget) => {
      //   const budgetName = budget.category?.name || budget.name || 'Budget';
      //   if (budget.status === 'exceeded') {
      //     showBudgetExceeded(budgetName, budget.percentage, budget.period_type);
      //   } else if (budget.status === 'warning') {
      //     showBudgetWarning(budgetName, budget.percentage, budget.period_type);
      //   }
      // });

    } catch (err) {
      console.error('Error fetching budgets:', err);
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, currency]);

  const createBudget = async (input: CreateBudgetInput): Promise<boolean> => {
    if (!user) return false;

    const { start, end } = getPeriodDates(input.period_type, input.start_date);
    const startDate = input.start_date || start;
    const endDate = input.end_date || end;

    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const newBudget: BudgetWithSpending = {
      id: tempId,
      user_id: user.id,
      category_id: input.category_id || null,
      amount: input.amount,
      period_type: input.period_type,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      name: input.name || `${input.period_type.charAt(0).toUpperCase() + input.period_type.slice(1)} Budget`,
      month: startDate.getMonth() + 1,
      year: startDate.getFullYear(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      spent: 0,
      remaining: input.amount,
      percentage: 0,
      status: 'safe'
    };

    setBudgets(current => [newBudget, ...current]);
    toast.success('Budget created successfully');

    try {
      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        category_id: input.category_id,
        amount: input.amount,
        period_type: input.period_type,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        name: newBudget.name,
        month: newBudget.month,
        year: newBudget.year
      });

      if (error) throw error;

      // Background fetch to ensure consistency
      fetchBudgets();
      return true;
    } catch (err) {
      console.error('Error creating budget:', err);
      // Revert optimistic update
      setBudgets(current => current.filter(b => b.id !== tempId));
      toast.error('Failed to create budget');
      return false;
    }
  };

  const updateBudget = async (input: UpdateBudgetInput): Promise<boolean> => {
    if (!user) return false;

    try {
      const updateData: Record<string, unknown> = {};

      if (input.category_id !== undefined) updateData.category_id = input.category_id;
      if (input.amount !== undefined) updateData.amount = input.amount;
      if (input.period_type !== undefined) updateData.period_type = input.period_type;
      if (input.name !== undefined) updateData.name = input.name;

      if (input.start_date) {
        updateData.start_date = input.start_date.toISOString();
        updateData.month = input.start_date.getMonth() + 1;
        updateData.year = input.start_date.getFullYear();
      }
      if (input.end_date) {
        updateData.end_date = input.end_date.toISOString();
      }

      const { error } = await supabase
        .from('budgets')
        .update(updateData)
        .eq('id', input.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Budget updated successfully');
      await fetchBudgets();
      return true;
    } catch (err) {
      console.error('Error updating budget:', err);
      toast.error('Failed to update budget');
      return false;
    }
  };

  const deleteBudget = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Budget deleted successfully');
      await fetchBudgets();
      return true;
    } catch (err) {
      console.error('Error deleting budget:', err);
      toast.error('Failed to delete budget');
      return false;
    }
  };

  const getHistoricalBudgets = async (categoryId?: string, months: number = 6): Promise<{ month: string; budget: number; spent: number }[]> => {
    if (!user) return [];

    try {
      const history: { month: string; budget: number; spent: number }[] = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = startOfMonth(targetDate);
        const end = endOfMonth(targetDate);

        // Get budget for this month
        let budgetQuery = supabase
          .from('budgets')
          .select('amount')
          .eq('user_id', user.id)
          .eq('month', start.getMonth() + 1)
          .eq('year', start.getFullYear());

        if (categoryId) {
          budgetQuery = budgetQuery.eq('category_id', categoryId);
        }

        const { data: budgetData } = await budgetQuery;
        const budgetAmount = budgetData?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

        // Get spending for this month
        let spendingQuery = supabase
          .from('transactions')
          .select('amount, currency_base')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .gte('date', start.toISOString())
          .lte('date', end.toISOString());

        if (categoryId) {
          spendingQuery = spendingQuery.eq('category_id', categoryId);
        }

        const { data: spendingData } = await spendingQuery;

        let spent = 0;
        if (spendingData) {
          for (const t of spendingData) {
            const storedCurrency = t.currency_base || 'USD';
            if (storedCurrency === currency) {
              spent += Number(t.amount);
            } else {
              const result = await convertAmountRef.current(Number(t.amount), storedCurrency, currency);
              spent += result ? result.convertedAmount : Number(t.amount);
            }
          }
        }

        history.push({
          month: format(start, 'MMM yyyy'),
          budget: budgetAmount,
          spent
        });
      }

      return history;
    } catch (err) {
      console.error('Error fetching historical budgets:', err);
      return [];
    }
  };

  const copyBudgetToNextPeriod = async (budgetId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const budget = budgets.find(b => b.id === budgetId);
      if (!budget) return false;

      const { start, end } = getPeriodDates(budget.period_type);
      const nextStart = new Date(end);
      nextStart.setDate(nextStart.getDate() + 1);
      const nextEnd = getPeriodDates(budget.period_type, nextStart).end;

      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        category_id: budget.category_id,
        amount: budget.amount,
        period_type: budget.period_type,
        start_date: nextStart.toISOString(),
        end_date: nextEnd.toISOString(),
        name: budget.name,
        month: nextStart.getMonth() + 1,
        year: nextStart.getFullYear()
      });

      if (error) throw error;

      toast.success('Budget copied to next period');
      await fetchBudgets();
      return true;
    } catch (err) {
      console.error('Error copying budget:', err);
      toast.error('Failed to copy budget');
      return false;
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Subscribe to realtime updates with debounce
  useEffect(() => {
    if (!user) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchBudgets();
      }, 1000);
    };

    const channel = supabase
      .channel('budgets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `user_id=eq.${user.id}`
        },
        debouncedFetch
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        debouncedFetch
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user, fetchBudgets]);

  return {
    budgets,
    loading,
    error,
    createBudget,
    updateBudget,
    deleteBudget,
    getHistoricalBudgets,
    copyBudgetToNextPeriod,
    refetch: fetchBudgets
  };
}
