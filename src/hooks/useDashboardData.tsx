import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { Transaction, CategorySpending, MonthlySpending } from '@/types';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { getTransactionCategoryName, getTransactionCategoryColor } from '@/lib/transactionUtils';

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
  const [budgets, setBudgets] = useState<BudgetWithSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currency, currencyVersion } = useCurrency();
  const { convertAmount } = useExchangeRate();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch transactions for the date range
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .gte('date', dateRange.from.toISOString())
        .lte('date', dateRange.to.toISOString())
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

      // Fetch budgets for current month
      const now = new Date();
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear());

      if (budgetError) throw budgetError;

      // Calculate spent for each budget
      const budgetsWithSpending = (budgetData || []).map((budget: any) => {
        const spent = convertedTransactions
          .filter(tx =>
            (tx.type === 'expense' || tx.type === 'lend' || tx.type === 'owe') &&
            tx.category_id === budget.category_id &&
            new Date(tx.date).getMonth() === now.getMonth() &&
            new Date(tx.date).getFullYear() === now.getFullYear()
          )
          .reduce((sum, tx) => sum + tx.convertedAmount, 0);

        return {
          id: budget.id,
          name: budget.name || budget.category?.name || 'General Budget',
          category: budget.category?.name,
          categoryColor: budget.category?.color,
          amount: Number(budget.amount),
          spent,
          remaining: Number(budget.amount) - spent,
          percentage: Number(budget.amount) > 0 ? (spent / Number(budget.amount)) * 100 : 0,
          periodType: budget.period_type,
          startDate: budget.start_date || format(startOfMonth(now), 'yyyy-MM-dd'),
          endDate: budget.end_date || format(endOfMonth(now), 'yyyy-MM-dd'),
        };
      });

      setBudgets(budgetsWithSpending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange.from, dateRange.to, currency, currencyVersion, convertAmount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate totals
  const totalExpenses = useMemo(() =>
    transactions.filter(t => t.type === 'expense' || t.type === 'lend' || t.type === 'owe').reduce((sum, t) => sum + t.convertedAmount, 0),
    [transactions]
  );

  const totalIncome = useMemo(() =>
    transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.convertedAmount, 0),
    [transactions]
  );

  const netBalance = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);

  const budgetRemaining = useMemo(() =>
    budgets.reduce((sum, b) => sum + b.remaining, 0),
    [budgets]
  );

  // Category spending breakdown
  const categoryData = useMemo<CategorySpending[]>(() => {
    const categoryMap: Record<string, CategorySpending> = {};

    transactions
      .filter(t => t.type === 'expense' || t.type === 'lend' || t.type === 'owe')
      .forEach(tx => {
        const catName = getTransactionCategoryName(tx);
        const catColor = getTransactionCategoryColor(tx);

        if (!categoryMap[catName]) {
          categoryMap[catName] = { name: catName, amount: 0, color: catColor, percentage: 0 };
        }
        categoryMap[catName].amount += tx.convertedAmount;
      });

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
          .filter(t => t.type === 'expense' || t.type === 'lend' || t.type === 'owe')
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
