import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useSubscription } from '@/hooks/useSubscription';
import { useBudgets } from '@/hooks/useBudgets';
import { Transaction, CategorySpending, MonthlySpending } from '@/types';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { getTransactionCategoryName, getTransactionCategoryColor, isRealExpense } from '@/lib/transactionUtils';
import { enforceHistoryWindow } from '@/lib/historyLimits';

interface ConvertedTransaction extends Transaction {
  convertedAmount: number;
}

interface BudgetWithSpending {
  id: string;
  name: string;
  category?: string;
  categoryColor?: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  periodType: string;
  startDate: string;
  endDate: string;
}

interface MonthlyTrendData {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

interface BudgetVsActualData {
  category: string;
  budget: number;
  actual: number;
  color?: string;
}

interface DashboardData {
  transactions: ConvertedTransaction[];
  totalExpenses: number;
  totalIncome: number;
  netBalance: number;
  budgetRemaining: number;
  categoryData: CategorySpending[];
  monthlyTrendData: MonthlyTrendData[];
  budgetVsActualData: BudgetVsActualData[];
  budgets: BudgetWithSpending[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboardData(dateRange: { from: Date; to: Date }): DashboardData {
  const [transactions, setTransactions] = useState<ConvertedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { convertAmount } = useExchangeRate();
  const { isPremium } = useSubscription();
  const { budgets: rawBudgets } = useBudgets();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const effectiveRange = enforceHistoryWindow(dateRange, isPremium).range;

      // Fetch transactions for the date range
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .gte('date', effectiveRange.from.toISOString())
        .lte('date', effectiveRange.to.toISOString())
        .order('date', { ascending: false });

      if (txError) throw txError;

      // Convert amounts to current currency
      const convertedTransactions = await Promise.all(
        (txData || []).map(async (tx) => {
          const storedCurrency = tx.currency_base || 'USD';
          if (storedCurrency === currency) {
            return { ...(tx as unknown as Transaction), convertedAmount: Number(tx.amount) };
          }
          const result = await convertAmount(Number(tx.amount), storedCurrency, currency);
          return {
            ...(tx as unknown as Transaction),
            convertedAmount: result ? result.convertedAmount : Number(tx.amount),
          };
        })
      );

      setTransactions(convertedTransactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, currency, convertAmount, isPremium]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate totals
  const totalExpenses = useMemo(() =>
    transactions.filter(isRealExpense).reduce((sum, t) => sum + t.convertedAmount, 0),
    [transactions]
  );

  const totalIncome = useMemo(() =>
    transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.convertedAmount, 0),
    [transactions]
  );

  const netBalance = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);

  // Map useBudgets() data to internal shape — same source as BudgetPage
  const budgets = useMemo<BudgetWithSpending[]>(() =>
    rawBudgets.map(b => ({
      id: b.id,
      name: b.name || b.category?.name || 'General Budget',
      category: b.category?.name,
      categoryColor: b.category?.color,
      amount: b.amount,
      spent: b.spent,
      remaining: b.remaining,
      percentage: b.percentage,
      periodType: b.period_type,
      startDate: b.start_date || '',
      endDate: b.end_date || '',
    })),
    [rawBudgets]
  );

  const budgetRemaining = useMemo(() =>
    budgets.reduce((sum, b) => sum + b.remaining, 0),
    [budgets]
  );

  // Category spending breakdown
  const categoryData = useMemo<CategorySpending[]>(() => {
    const categoryMap: Record<string, CategorySpending> = {};

    transactions
      .filter(isRealExpense)
      .forEach(tx => {
        const catName = getTransactionCategoryName(tx);
        const catColor = getTransactionCategoryColor(tx);

        if (!categoryMap[catName]) {
          categoryMap[catName] = { name: catName, amount: 0, color: catColor, percentage: 0 };
        }
        categoryMap[catName].amount += tx.convertedAmount;
      });

    if (!categoryMap.Savings) {
      categoryMap.Savings = {
        name: 'Savings',
        amount: 0,
        color: '#10B981',
        percentage: 0,
      };
    }

    return Object.values(categoryMap).map(cat => ({
      ...cat,
      percentage: totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);
  }, [transactions, totalExpenses]);

  // Monthly trend data (last 6 months)
  const monthlyTrendData = useMemo<MonthlyTrendData[]>(() => {
    const now = new Date();
    const months: MonthlyTrendData[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthName = format(monthDate, 'MMM');

      const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      months.push({
        month: monthName,
        income: monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.convertedAmount, 0),
        expenses: monthTransactions
          .filter(isRealExpense)
          .reduce((sum, t) => sum + t.convertedAmount, 0),
        savings: monthTransactions
          .filter(t => t.savings_goal_id && t.category?.name === 'Savings')
          .reduce((sum, t) => sum + t.convertedAmount, 0),
      });
    }

    return months;
  }, [transactions]);

  // Budget vs Actual data
  const budgetVsActualData = useMemo<BudgetVsActualData[]>(() => {
    return budgets.map(budget => ({
      category: budget.category || 'General',
      budget: budget.amount,
      actual: budget.spent,
      color: budget.categoryColor,
    }));
  }, [budgets]);

  return {
    transactions,
    totalExpenses,
    totalIncome,
    netBalance,
    budgetRemaining,
    categoryData,
    monthlyTrendData,
    budgetVsActualData,
    budgets,
    loading,
    error,
    refetch: fetchData,
  };
}
