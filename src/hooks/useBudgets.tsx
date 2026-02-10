import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, format } from 'date-fns';
import { Category } from '@/types';
import { showBudgetWarning, showBudgetExceeded } from '@/lib/notificationManager';
import { emitTransactionUpdated } from '@/lib/transaction-events';

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
  is_template: boolean;
  template_name: string | null;
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
  is_template?: boolean;
  template_name?: string;
}

export interface UpdateBudgetInput extends Partial<CreateBudgetInput> {
  id: string;
}

interface BudgetSpendingRow {
  amount: number | string;
  currency_base: string | null;
  category?: {
    category_type?: string | null;
  } | null;
}

// Notification manager now handles alert deduplication

export function useBudgets() {
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { convertAmount } = useExchangeRate();

  const emitBudgetSyncEvents = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new Event('budget-updated'));
    emitTransactionUpdated();
  }, []);

  // Refs to prevent infinite loops and duplicate fetches
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const convertAmountRef = useRef(convertAmount);

  // Keep convertAmount ref up to date
  useEffect(() => {
    convertAmountRef.current = convertAmount;
  }, [convertAmount]);

  // Returns start/end dates for a given period type and start date
  // Returns start/end dates for a given period type and start date
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

  // Fetch budgets and compute spending for each
  // Fetch budgets and compute spending for each
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
      // Fetch budgets with categories (exclude templates)
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .eq('is_template', false)
        .order('created_at', { ascending: false });

      if (budgetsError) throw budgetsError;

      // Filter to current period budgets (support recurring)
      // Filter to current period budgets (support recurring)
      const now = new Date();
      const activeBudgets = (budgetsData || []).filter((budget) => {
        if (budget.start_date && budget.end_date) {
          // Recurring: if is_template, skip; else, check interval
          // Recurring: if is_template, skip; else, check interval
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

          // Query transactions for this budget's period/category
          // Query transactions for this budget's period/category
          let query = supabase
            .from('transactions')
            .select('amount, currency_base, category_id, category:categories(category_type)')
            .select('amount, currency_base, category_id, category:categories(category_type)')
            .eq('user_id', user.id)
            .eq('type', 'expense')
            .gte('date', startDate)
            .lte('date', endDate);

          if (budget.category_id) {
            query = query.eq('category_id', budget.category_id);
          }

          const { data: transactions } = await query;

          // Filter out lend/owe system categories from expense budgets
          // (they're transfers, not true expenses)
          const filteredTransactions = (transactions as BudgetSpendingRow[] | null)?.filter((t) => {
            const categoryType = t.category?.category_type;
            return !['lend', 'owe'].includes(categoryType || '');
          }) || [];

          // Sum transactions, convert currency if needed
          // Filter out lend/owe system categories from expense budgets
          // (they're transfers, not true expenses)
          const filteredTransactions = transactions?.filter((t: any) => {
            const categoryType = t.category?.category_type;
            return !['lend', 'owe'].includes(categoryType || '');
          }) || [];

          // Sum transactions, convert currency if needed
          let spent = 0;
          if (filteredTransactions) {
            for (const t of filteredTransactions) {
          if (filteredTransactions) {
            for (const t of filteredTransactions) {
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
      is_template: input.is_template || false,
      template_name: input.template_name || null,
      is_template: input.is_template || false,
      template_name: input.template_name || null,
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
        year: newBudget.year,
        is_template: input.is_template || false,
        template_name: input.template_name || null
      });

      if (error) throw error;

      // Background fetch to ensure consistency
      fetchBudgets();
      emitBudgetSyncEvents();
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
      emitBudgetSyncEvents();
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
      emitBudgetSyncEvents();
      return true;
    } catch (err) {
      console.error('Error deleting budget:', err);
      toast.error('Failed to delete budget');
      return false;
    }
  };

  const getHistoricalBudgets = useCallback(async (categoryId?: string, months: number = 6): Promise<{ month: string; budget: number; spent: number }[]> => {
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
  }, [user, currency]);

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
      emitBudgetSyncEvents();
      return true;
    } catch (err) {
      console.error('Error copying budget:', err);
      toast.error('Failed to copy budget');
      return false;
    }
  };

  const saveAsTemplate = async (budgetId: string, templateName?: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const budget = budgets.find(b => b.id === budgetId);
      if (!budget) return false;

      const { error } = await supabase
        .from('budgets')
        .update({
          is_template: true,
          template_name: templateName || budget.name || budget.category?.name || 'Budget Template'
        } as any)
        } as any)
        .eq('id', budgetId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Budget saved as template');
      await fetchBudgets();
      emitBudgetSyncEvents();
      return true;
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error('Failed to save template');
      return false;
    }
  };

  const fetchTemplates = async (): Promise<Budget[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .eq('is_template', true)
        .order('template_name', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data || []) as unknown as Budget[]);
    } catch (err) {
      console.error('Error fetching templates:', err);
      return [];
    }
  };

  const createBudgetFromTemplate = async (templateId: string, customStartDate?: Date): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: template, error: fetchError } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('id', templateId)
        .eq('user_id', user.id)
        .eq('is_template', true)
        .single();

      if (fetchError || !template) {
        throw new Error('Template not found');
      }

      const { start, end } = getPeriodDates(template.period_type as PeriodType, customStartDate);

      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        category_id: template.category_id,
        amount: template.amount,
        period_type: template.period_type,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        name: template.name,
        month: start.getMonth() + 1,
        year: start.getFullYear(),
        is_template: false
      });

      if (error) throw error;

      toast.success('Budget created from template');
      await fetchBudgets();
      emitBudgetSyncEvents();
      return true;
    } catch (err) {
      console.error('Error creating budget from template:', err);
      toast.error('Failed to create budget from template');
      return false;
    }
  };

  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', templateId)
        .eq('user_id', user.id)
        .eq('is_template', true);

      if (error) throw error;

      toast.success('Template deleted');
      emitBudgetSyncEvents();
      return true;
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error('Failed to delete template');
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
    saveAsTemplate,
    fetchTemplates,
    createBudgetFromTemplate,
    deleteTemplate,
    refetch: fetchBudgets
  };
}
