import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { ReportFilters } from "./useReportTemplates";

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
}

export function useReportData(filters: ReportFilters) {
  const { user } = useAuth();

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

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["report-transactions", user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("transactions")
        .select("*, category:categories(*)")
        .eq("user_id", user.id)
        .gte("date", filters.dateFrom)
        .lte("date", filters.dateTo + "T23:59:59")
        .order("date", { ascending: false });

      if (filters.categoryIds.length > 0) {
        query = query.in("category_id", filters.categoryIds);
      }

      if (filters.transactionType !== "all") {
        query = query.eq("type", filters.transactionType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!filters.dateFrom && !!filters.dateTo,
  });

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ["report-budgets", user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("budgets")
        .select("*, category:categories(*)")
        .eq("user_id", user.id)
        .or(
          `and(start_date.lte.${filters.dateTo},end_date.gte.${filters.dateFrom}),and(start_date.is.null,end_date.is.null)`
        );

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!filters.dateFrom && !!filters.dateTo,
  });

  const reportData = useMemo((): ReportData => {
    // Summary calculations
    const expenses = transactions.filter((t) => t.type === "expense");
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

    if (filters.dateFrom && filters.dateTo) {
      const days = eachDayOfInterval({
        start: parseISO(filters.dateFrom),
        end: parseISO(filters.dateTo),
      });

      days.forEach((day) => {
        dailyMap.set(format(day, "yyyy-MM-dd"), { expenses: 0, income: 0 });
      });
    }

    transactions.forEach((t) => {
      const dateKey = format(new Date(t.date), "yyyy-MM-dd");
      const existing = dailyMap.get(dateKey) || { expenses: 0, income: 0 };
      if (t.type === "expense") {
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

    // Budget performance
    const budgetPerformance = budgets.map((b) => {
      const categoryExpenses = expenses.filter(
        (t) => t.category_id === b.category_id
      );
      const spent = categoryExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
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

    return {
      summary,
      categoryBreakdown,
      dailyExpenses,
      budgetPerformance,
      transactions: formattedTransactions,
    };
  }, [transactions, budgets, filters]);

  return {
    reportData,
    isLoading: transactionsLoading || budgetsLoading,
    categories,
  };
}
