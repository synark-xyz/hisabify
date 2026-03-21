import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useSubscription } from "./useSubscription";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { ReportFilters } from "./useReportTemplates";
import { enforceHistoryWindowForFilters } from "@/lib/historyLimits";

export interface ReportData {
  summary: {
    totalExpenses: number;
    totalIncome: number;
    netBalance: number;
    transactionCount: number;
    averageExpense: number;
    averageIncome: number;
  };
  categoryBreakdown: Array<{
    category: string;
    categoryId: string | null;
    color: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  dailyExpenses: Array<{
    date: string;
    expenses: number;
    income: number;
  }>;
  budgetPerformance: Array<{
    name: string;
    category: string;
    budgeted: number;
    spent: number;
    remaining: number;
    percentage: number;
  }>;
  transactions: Array<{
    id: string;
    date: string;
    merchant: string;
    category: string;
    type: string;
    amount: number;
    note: string | null;
  }>;
  savingsPerformance: Array<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    percentage: number;
    deadline: string | null;
    isCompleted: boolean;
    completedAt: string | null;
  }>;
}

export function useReportData(filters: ReportFilters) {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const effectiveFilters = useMemo(() => {
    const clamped = enforceHistoryWindowForFilters(filters.dateFrom, filters.dateTo, isPremium);
    return {
      ...filters,
      dateFrom: clamped.dateFrom,
      dateTo: clamped.dateTo,
    };
  }, [filters, isPremium]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: transactions = [], isLoading: transactionsLoading, isError: transactionsError } = useQuery({
    queryKey: ["report-transactions", user?.id, effectiveFilters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("transactions")
        .select("*, category:categories(*)")
        .eq("user_id", user.id)
        .gte("date", effectiveFilters.dateFrom)
        .lte("date", effectiveFilters.dateTo + "T23:59:59")
        .order("date", { ascending: false });

      if (effectiveFilters.categoryIds.length > 0) {
        query = query.in("category_id", effectiveFilters.categoryIds);
      }

      if (effectiveFilters.transactionType !== "all") {
        query = query.eq("type", effectiveFilters.transactionType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!effectiveFilters.dateFrom && !!effectiveFilters.dateTo,
  });

  const { data: savingsGoals = [], isLoading: savingsLoading, isError: savingsError } = useQuery({
    queryKey: ["report-savings-goals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("savings_goals")
        .select("id, name, target_amount, current_amount, deadline, completed_at, archived_at")
        .eq("user_id", user.id)
        .is("archived_at", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // All-time savings transactions — needed to compute true current_amount per goal
  // (the DB current_amount column can be stale; useSavingsGoals derives it from transactions)
  const { data: savingsTransactions = [], isLoading: savingsTxLoading, isError: savingsTxError } = useQuery({
    queryKey: ["report-savings-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, amount_converted, savings_goal_id, category:categories(name)")
        .eq("user_id", user.id)
        .not("savings_goal_id", "is", null)
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: budgets = [], isLoading: budgetsLoading, isError: budgetsError } = useQuery({
    // No date filter — we filter in JS so we catch all budget types (continuous, month/year, period)
    queryKey: ["report-budgets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("budgets")
        .select("*, category:categories(*)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const reportData = useMemo((): ReportData => {
    const reportDateFrom = new Date(effectiveFilters.dateFrom);
    const reportDateTo = new Date(effectiveFilters.dateTo);

    // Summary calculations
    const expenses = transactions.filter((t) => t.type === "expense" && !t.savings_goal_id);
    const income = transactions.filter((t) => t.type === "income");

    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalIncome = income.reduce((sum, t) => sum + Number(t.amount), 0);

    const summary = {
      totalExpenses,
      totalIncome,
      netBalance: totalIncome - totalExpenses,
      transactionCount: transactions.length,
      averageExpense: expenses.length > 0 ? totalExpenses / expenses.length : 0,
      averageIncome: income.length > 0 ? totalIncome / income.length : 0,
    };

    // Category breakdown
    const categoryMap = new Map<
      string,
      { amount: number; count: number; color: string; categoryId: string | null }
    >();

    expenses.forEach((t) => {
      const categoryName = t.category?.name || "Other";
      const existing = categoryMap.get(categoryName) || {
        amount: 0,
        count: 0,
        color: t.category?.color || "#6B7280",
        categoryId: t.category_id,
      };
      categoryMap.set(categoryName, {
        ...existing,
        amount: existing.amount + Number(t.amount),
        count: existing.count + 1,
      });
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        categoryId: data.categoryId,
        color: data.color,
        amount: data.amount,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Daily expenses
    const dailyMap = new Map<string, { expenses: number; income: number }>();

    if (effectiveFilters.dateFrom && effectiveFilters.dateTo) {
      const days = eachDayOfInterval({
        start: parseISO(effectiveFilters.dateFrom),
        end: parseISO(effectiveFilters.dateTo),
      });

      days.forEach((day) => {
        dailyMap.set(format(day, "yyyy-MM-dd"), { expenses: 0, income: 0 });
      });
    }

    transactions.forEach((t) => {
      const dateKey = format(new Date(t.date), "yyyy-MM-dd");
      const existing = dailyMap.get(dateKey) || { expenses: 0, income: 0 };
      if (t.type === "expense" && !t.savings_goal_id) {
        existing.expenses += Number(t.amount);
      } else {
        existing.income += Number(t.amount);
      }
      dailyMap.set(dateKey, existing);
    });

    const dailyExpenses = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Budget performance — filter to budgets active during the report period
    const activeBudgets = budgets.filter((b) => {
      // Skip template budgets
      if (b.is_template) return false;

      const hasStart = !!b.start_date;
      const hasEnd = !!b.end_date;

      if (!hasStart && !hasEnd) {
        // Match by month/year: budget month must overlap the report period
        const budgetStart = new Date(b.year, b.month - 1, 1);
        const budgetEnd = new Date(b.year, b.month, 0); // last day of that month
        return budgetStart <= reportDateTo && budgetEnd >= reportDateFrom;
      }

      const start = hasStart ? new Date(b.start_date) : null;
      const end = hasEnd ? new Date(b.end_date) : null;

      if (start && !end) {
        // Continuous budget: active from start_date onwards
        return start <= reportDateTo;
      }
      if (start && end) {
        // Period budget: must overlap with report period
        return start <= reportDateTo && end >= reportDateFrom;
      }
      return false;
    });

    // Index spent amounts by budget_id from report-period transactions
    const budgetIdToSpent = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.type === "expense" && t.budget_id) {
        budgetIdToSpent.set(t.budget_id, (budgetIdToSpent.get(t.budget_id) || 0) + Number(t.amount));
      }
    });

    const budgetPerformance = activeBudgets.map((b) => {
      // Primary: use budget_id linked transactions
      let spent = budgetIdToSpent.get(b.id) || 0;

      // Fallback: category matching for budgets not yet linked via budget_id
      if (spent === 0 && b.category_id) {
        spent = expenses
          .filter((t) => t.category_id === b.category_id)
          .reduce((sum, t) => sum + Number(t.amount), 0);
      }

      const budgeted = Number(b.amount);
      return {
        name: b.name || b.category?.name || "General",
        category: b.category?.name || "General",
        budgeted,
        spent,
        remaining: Math.max(budgeted - spent, 0),
        percentage: budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0,
      };
    });

    // Formatted transactions
    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      date: format(new Date(t.date), "yyyy-MM-dd"),
      merchant: t.merchant,
      category: t.category?.name || "Other",
      type: t.type,
      amount: Number(t.amount),
      note: t.note,
    }));

    // Savings performance — derive currentAmount from all-time savings transactions,
    // same logic as useSavingsGoals (DB current_amount can be stale)
    const savingsPerformance = savingsGoals.map((g) => {
      const target = Number(g.target_amount);

      // Sum contributions minus withdrawals for this goal
      const goalTxs = savingsTransactions.filter((t) => t.savings_goal_id === g.id);
      const netAmount = goalTxs.reduce((sum: number, tx) => {
        const amt = Number(tx.amount_converted || tx.amount);
        const categoryName = tx.category?.name;
        if (categoryName === "Savings") return sum + amt;
        if (categoryName === "Savings Return") return sum - amt;
        return sum;
      }, 0);
      const current = Math.max(netAmount, 0);

      const isCompleted = !!g.completed_at || (target > 0 && current >= target);
      return {
        name: g.name,
        targetAmount: target,
        currentAmount: isCompleted ? target : current,
        percentage: isCompleted ? 100 : (target > 0 ? Math.min((current / target) * 100, 100) : 0),
        deadline: g.deadline ?? null,
        isCompleted,
        completedAt: g.completed_at ?? null,
      };
    });

    return {
      summary,
      categoryBreakdown,
      dailyExpenses,
      budgetPerformance,
      transactions: formattedTransactions,
      savingsPerformance,
    };
  }, [transactions, budgets, savingsGoals, savingsTransactions, effectiveFilters]);

  return {
    reportData,
    isLoading: transactionsLoading || budgetsLoading || savingsLoading || savingsTxLoading,
    isError: transactionsError || budgetsError || savingsError || savingsTxError,
    categories,
  };
}
