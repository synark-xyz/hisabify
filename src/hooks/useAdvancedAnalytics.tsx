import { useMemo } from 'react';
import {
  format,
  subMonths,
  subYears,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  differenceInDays,
  getDay,
  eachDayOfInterval,
  parseISO,
  isSameMonth,
  isSameYear,
  startOfYear,
  endOfYear
} from 'date-fns';

import { Transaction } from '@/types';
import { isRealExpense } from '@/lib/transactionUtils';
import { t } from 'i18next';
import { useNumberTranslation } from '@/lib/i18nNumber';
import { analytics } from '@/lib/analytics';

interface ConvertedTransaction extends Transaction {
  convertedAmount: number;
}

// Simple linear regression for trend prediction
function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0 };

  const xSum = data.reduce((sum, _, i) => sum + i, 0);
  const ySum = data.reduce((sum, y) => sum + y, 0);
  const xySum = data.reduce((sum, y, i) => sum + i * y, 0);
  const x2Sum = data.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum) || 0;
  const intercept = (ySum - slope * xSum) / n || 0;

  return { slope, intercept };
}

export interface SpendingPattern {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  mostExpensiveCategory: { name: string; amount: number; color: string } | null;
  mostExpensiveDay: { date: string; amount: number } | null;
  spendingStreak: number; // consecutive days with spending
  unusualSpending: { isUnusual: boolean; percentageAboveNormal: number };
}

export interface Insight {
  id: string;
  type: 'comparison' | 'alert' | 'achievement' | 'prediction';
  icon: string;
  title: string;
  description: string;
  value?: number;
  trend?: 'up' | 'down' | 'neutral';
  suggestion?: string;
}

export interface MonthComparison {
  currentMonth: { income: number; expenses: number; net: number };
  lastMonth: { income: number; expenses: number; net: number };
  percentageChange: { income: number; expenses: number; net: number };
}

export interface YearComparison {
  currentYear: { income: number; expenses: number; net: number };
  lastYear: { income: number; expenses: number; net: number };
  percentageChange: { income: number; expenses: number; net: number };
}

export interface TrendPrediction {
  nextMonthExpenses: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  monthlyData: { month: string; actual: number; predicted?: number }[];
}

export interface HeatMapData {
  date: string;
  amount: number;
  count: number;
  intensity: number; // 0-4 scale
}

export interface DayOfWeekAnalysis {
  dayName: string;
  dayIndex: number;
  totalSpent: number;
  averageSpent: number;
  transactionCount: number;
  percentage: number;
}

export function useAdvancedAnalytics(transactions: ConvertedTransaction[]) {
  const { tn } = useNumberTranslation();

  // Spending patterns analysis
  const spendingPatterns = useMemo<SpendingPattern>(() => {
    const expenses = transactions.filter(isRealExpense);

    if (expenses.length === 0) {
      return {
        dailyAverage: 0,
        weeklyAverage: 0,
        monthlyAverage: 0,
        mostExpensiveCategory: null,
        mostExpensiveDay: null,
        spendingStreak: 0,
        unusualSpending: { isUnusual: false, percentageAboveNormal: 0 },
      };
    }

    // Get date range
    const dates = expenses.map(t => new Date(t.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const dayRange = Math.max(1, differenceInDays(maxDate, minDate) + 1);

    const totalExpenses = expenses.reduce((sum, t) => sum + t.convertedAmount, 0);
    const dailyAverage = totalExpenses / dayRange;
    const weeklyAverage = dailyAverage * 7;
    const monthlyAverage = dailyAverage * 30;

    // Most expensive category
    const categoryMap: Record<string, { amount: number; color: string }> = {};
    expenses.forEach(t => {
      const catName = t.category?.name || 'Other';
      const catColor = t.category?.color || '#6B7280';
      if (!categoryMap[catName]) {
        categoryMap[catName] = { amount: 0, color: catColor };
      }
      categoryMap[catName].amount += t.convertedAmount;
    });

    const sortedCategories = Object.entries(categoryMap)
      .sort(([, a], [, b]) => b.amount - a.amount);

    const mostExpensiveCategory = sortedCategories.length > 0
      ? { name: sortedCategories[0][0], ...sortedCategories[0][1] }
      : null;

    // Most expensive day
    const dayMap: Record<string, number> = {};
    expenses.forEach(t => {
      const dayKey = format(new Date(t.date), 'yyyy-MM-dd');
      dayMap[dayKey] = (dayMap[dayKey] || 0) + t.convertedAmount;
    });

    const sortedDays = Object.entries(dayMap).sort(([, a], [, b]) => b - a);
    const mostExpensiveDay = sortedDays.length > 0
      ? { date: sortedDays[0][0], amount: sortedDays[0][1] }
      : null;

    // Spending streak (consecutive days with expenses)
    const sortedDayKeys = Object.keys(dayMap).sort();
    let currentStreak = 0;
    let maxStreak = 0;

    for (let i = 0; i < sortedDayKeys.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prevDate = new Date(sortedDayKeys[i - 1]);
        const currDate = new Date(sortedDayKeys[i]);
        if (differenceInDays(currDate, prevDate) === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, currentStreak);
    }

    // Unusual spending detection (current month vs average)
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthExpenses = expenses
      .filter(t => new Date(t.date) >= currentMonthStart)
      .reduce((sum, t) => sum + t.convertedAmount, 0);

    const percentageAboveNormal = monthlyAverage > 0
      ? ((currentMonthExpenses - monthlyAverage) / monthlyAverage) * 100
      : 0;

    return {
      dailyAverage,
      weeklyAverage,
      monthlyAverage,
      mostExpensiveCategory,
      mostExpensiveDay,
      spendingStreak: maxStreak,
      unusualSpending: {
        isUnusual: percentageAboveNormal > 20,
        percentageAboveNormal,
      },
    };
  }, [transactions]);

  // Generate insights
  const insights = useMemo<Insight[]>(() => {
    const insightsList: Insight[] = [];
    const expenses = transactions.filter(isRealExpense);
    const now = new Date();

    // Month comparison insight
    const currentMonthExpenses = expenses
      .filter(t => isSameMonth(new Date(t.date), now))
      .reduce((sum, t) => sum + t.convertedAmount, 0);

    const lastMonthExpenses = expenses
      .filter(t => isSameMonth(new Date(t.date), subMonths(now, 1)))
      .reduce((sum, t) => sum + t.convertedAmount, 0);

    if (lastMonthExpenses > 0) {
      const changePercent = ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
      const changePercentRounded = Math.round(changePercent);
      if (Math.abs(changePercent) > 5) {
        insightsList.push({
          id: 'monthly-comparison',
          type: 'comparison',
          icon: changePercent > 0 ? '📈' : '📉',
          title: changePercent > 0 ? t('analytics.spendingIncreased') : t('analytics.spendingDecreased'),
          description: t(changePercent > 0 ? 'analytics.spentMoreThisMonth' : 'analytics.spentLessThisMonth', { percent: tn(changePercentRounded) }),
          value: changePercent,
          trend: changePercent > 0 ? 'up' : 'down',
          suggestion: changePercent > 0
            ? t('analytics.suggestReduceNonEssential')
            : t('analytics.suggestGreatJobSavings')
        });
      }
    }

    // Biggest expense insight
    if (spendingPatterns.mostExpensiveCategory) {
      insightsList.push({
        id: 'biggest-expense',
        type: 'alert',
        icon: '💸',
        title: t('analytics.biggestExpenseCategory'),
        description: t('analytics.yourBiggestSpendingArea', { category: spendingPatterns.mostExpensiveCategory.name }),
        value: spendingPatterns.mostExpensiveCategory.amount,
        trend: 'neutral',
        suggestion: t('analytics.suggestBiggestExpense', { category: spendingPatterns.mostExpensiveCategory.name })
      });
    }

    // Unusual spending alert
    if (spendingPatterns.unusualSpending.isUnusual) {
      insightsList.push({
        id: 'unusual-spending',
        type: 'alert',
        icon: '⚠️',
        title: t('analytics.unusualSpendingDetected'),
        description: t('analytics.spendingHigherThanAverage', { percent: spendingPatterns.unusualSpending.percentageAboveNormal.toFixed(0) }),
        value: spendingPatterns.unusualSpending.percentageAboveNormal,
        trend: 'up',
        suggestion: t('analytics.suggestReviewTransactions')
      });
    }

    // Spending streak
    if (spendingPatterns.spendingStreak >= 7) {
      insightsList.push({
        id: 'spending-streak',
        type: 'alert',
        icon: '🔥',
        title: t('analytics.spendingStreak'),
        description: t('analytics.spentForDays', { days: spendingPatterns.spendingStreak }),
        value: spendingPatterns.spendingStreak,
        trend: 'up',
        suggestion: t('analytics.suggestNoSpendDay')
      });
    }

    // Savings achievement
    const currentMonthIncome = transactions
      .filter(t => t.type === 'income' && isSameMonth(new Date(t.date), now))
      .reduce((sum, t) => sum + t.convertedAmount, 0);

    if (currentMonthIncome > currentMonthExpenses && currentMonthIncome > 0) {
      const savingsRate = ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100;
      if (savingsRate >= 20) {
        insightsList.push({
          id: 'savings-achievement',
          type: 'achievement',
          icon: '🎉',
          title: t('analytics.greatSavings'),
          description: t('analytics.savingsPercentIncome', { percent: tn(Math.round(savingsRate)) }),
          value: savingsRate,
          trend: 'down',
          suggestion: t('analytics.suggestDiversifySavings')
        });
      }
    }

    return insightsList;
  }, [transactions, spendingPatterns]);

  // Month comparison
  const monthComparison = useMemo<MonthComparison>(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const calcPeriod = (start: Date, end: Date) => {
      const periodTx = transactions.filter(t => {
        const date = new Date(t.date);
        return date >= start && date <= end;
      });

      const income = periodTx
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.convertedAmount, 0);
      const expenses = periodTx
        .filter(isRealExpense)
        .reduce((sum, t) => sum + t.convertedAmount, 0);

      return { income, expenses, net: income - expenses };
    };

    const currentMonth = calcPeriod(currentMonthStart, currentMonthEnd);
    const lastMonth = calcPeriod(lastMonthStart, lastMonthEnd);

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      currentMonth,
      lastMonth,
      percentageChange: {
        income: calcChange(currentMonth.income, lastMonth.income),
        expenses: calcChange(currentMonth.expenses, lastMonth.expenses),
        net: calcChange(currentMonth.net, lastMonth.net),
      },
    };
  }, [transactions]);

  // Year comparison
  const yearComparison = useMemo<YearComparison>(() => {
    const now = new Date();
    const currentYearStart = startOfYear(now);
    const currentYearEnd = endOfYear(now);
    const lastYearStart = startOfYear(subYears(now, 1));
    const lastYearEnd = endOfYear(subYears(now, 1));

    const calcPeriod = (start: Date, end: Date) => {
      const periodTx = transactions.filter(t => {
        const date = new Date(t.date);
        return date >= start && date <= end;
      });

      const income = periodTx
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.convertedAmount, 0);
      const expenses = periodTx
        .filter(isRealExpense)
        .reduce((sum, t) => sum + t.convertedAmount, 0);

      return { income, expenses, net: income - expenses };
    };

    const currentYear = calcPeriod(currentYearStart, currentYearEnd);
    const lastYear = calcPeriod(lastYearStart, lastYearEnd);

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      currentYear,
      lastYear,
      percentageChange: {
        income: calcChange(currentYear.income, lastYear.income),
        expenses: calcChange(currentYear.expenses, lastYear.expenses),
        net: calcChange(currentYear.net, lastYear.net),
      },
    };
  }, [transactions]);

  // Trend predictions using linear regression
  const trendPrediction = useMemo<TrendPrediction>(() => {
    const now = new Date();
    const monthlyData: { month: string; actual: number }[] = [];

    // Get last 6 months of data
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthExpenses = transactions
        .filter(t => {
          const date = new Date(t.date);
          return isRealExpense(t) && date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, t) => sum + t.convertedAmount, 0);

      monthlyData.push({
        month: format(monthDate, 'MMM'),
        actual: monthExpenses,
      });
    }

    const values = monthlyData.map(d => d.actual);
    const { slope, intercept } = linearRegression(values);

    // Predict next month
    const nextMonthPrediction = slope * values.length + intercept;
    const nextMonthExpenses = Math.max(0, nextMonthPrediction);

    // Calculate confidence based on variance
    const mean = values.reduce((a, b) => a + b, 0) / values.length || 0;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length || 0;
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 0;
    const confidence = Math.max(0, Math.min(100, (1 - coefficientOfVariation) * 100));

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (slope > mean * 0.05) trend = 'increasing';
    else if (slope < -mean * 0.05) trend = 'decreasing';

    return {
      nextMonthExpenses,
      confidence,
      trend,
      monthlyData: [
        ...monthlyData,
        { month: format(subMonths(now, -1), 'MMM'), actual: 0, predicted: nextMonthExpenses },
      ],
    };
  }, [transactions]);

  // Heat map data (calendar view)
  const heatMapData = useMemo<HeatMapData[]>(() => {
    const now = new Date();
    const startDate = subMonths(startOfMonth(now), 2);
    const endDate = endOfMonth(now);

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const expenses = transactions.filter(isRealExpense);

    // Calculate daily amounts
    const dayMap: Record<string, { amount: number; count: number }> = {};
    expenses.forEach(t => {
      const dayKey = format(new Date(t.date), 'yyyy-MM-dd');
      if (!dayMap[dayKey]) {
        dayMap[dayKey] = { amount: 0, count: 0 };
      }
      dayMap[dayKey].amount += t.convertedAmount;
      dayMap[dayKey].count++;
    });

    // Find max for intensity calculation
    const amounts = Object.values(dayMap).map(d => d.amount);
    const maxAmount = Math.max(...amounts, 1);

    return days.map(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const data = dayMap[dayKey] || { amount: 0, count: 0 };

      // Calculate intensity (0-4 scale)
      let intensity = 0;
      if (data.amount > 0) {
        const ratio = data.amount / maxAmount;
        if (ratio > 0.75) intensity = 4;
        else if (ratio > 0.5) intensity = 3;
        else if (ratio > 0.25) intensity = 2;
        else intensity = 1;
      }

      return {
        date: dayKey,
        amount: data.amount,
        count: data.count,
        intensity,
      };
    });
  }, [transactions]);

  // Day of week analysis
  const dayOfWeekAnalysis = useMemo<DayOfWeekAnalysis[]>(() => {
    const dayNames = [
      t('analytics.weekSunday'),
      t('analytics.weekMonday'),
      t('analytics.weekTuesday'),
      t('analytics.weekWednesday'),
      t('analytics.weekThursday'),
      t('analytics.weekFriday'),
      t('analytics.weekSaturday'),
    ];
    const expenses = transactions.filter(isRealExpense);

    // Group by day of week
    const dayData: Record<number, { total: number; count: number; days: Set<string> }> = {};
    for (let i = 0; i < 7; i++) {
      dayData[i] = { total: 0, count: 0, days: new Set() };
    }

    expenses.forEach(t => {
      const date = new Date(t.date);
      const dayIndex = getDay(date);
      const dayKey = format(date, 'yyyy-MM-dd');

      dayData[dayIndex].total += t.convertedAmount;
      dayData[dayIndex].count++;
      dayData[dayIndex].days.add(dayKey);
    });

    const totalSpent = expenses.reduce((sum, t) => sum + t.convertedAmount, 0);

    return dayNames.map((name, index) => ({
      dayName: name,
      dayIndex: index,
      totalSpent: dayData[index].total,
      averageSpent: dayData[index].days.size > 0
        ? dayData[index].total / dayData[index].days.size
        : 0,
      transactionCount: dayData[index].count,
      percentage: totalSpent > 0 ? (dayData[index].total / totalSpent) * 100 : 0,
    }));
  }, [transactions]);

  return {
    spendingPatterns,
    insights,
    monthComparison,
    yearComparison,
    trendPrediction,
    heatMapData,
    dayOfWeekAnalysis,
  };
}
