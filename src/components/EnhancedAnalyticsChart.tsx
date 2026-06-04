import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
  CartesianGrid,
  Line,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Lightbulb, PieChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/hooks/useCurrency';
import { useLanguage, getLanguageLocale } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getTransactionCategoryName } from '@/lib/transactionUtils';
import {
  CategorySpending,
  AnalyticsInsight,
} from '@/types';
import { format, startOfYear, endOfYear, subYears } from 'date-fns';
import { bn, ja } from 'date-fns/locale';
import { cn, getLocalizedCategoryName } from '@/lib/utils';
import { localizeNumber, localizeYear } from '@/lib/i18nNumber';

interface EnhancedAnalyticsChartProps {
  selectedYear: number;
  selectedMonth?: string;
  onMonthSelect?: (month: string) => void;
}

type QuarterFilter = 'All' | 'Q1' | 'Q2' | 'Q3' | 'Q4';
type ChartMode = 'expenses' | 'savings' | 'both';

const QUARTER_OPTIONS: QuarterFilter[] = ['All', 'Q1', 'Q2', 'Q3', 'Q4'];
const CHART_MODE_OPTIONS: ChartMode[] = ['expenses', 'savings', 'both'];
const SAVINGS_COLOR = '#10B981';

interface ChartDatum {
  month: string;
  amount: number;
  savingsAmount: number;
  incomeAmount: number;
  cumulativeSavings: number;
  year: number;
  topCategory?: string;
  comparisonAmount?: number;
  completedGoals: Array<{ name: string; amount: number }>;
  budgetMarker: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; payload: ChartDatum }>;
  label?: string;
}

export function EnhancedAnalyticsChart({
  selectedYear,
  selectedMonth,
  onMonthSelect
}: EnhancedAnalyticsChartProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const { language } = useLanguage();
  const formatPercent = (value: number) =>
    new Intl.NumberFormat(getLanguageLocale(language), { maximumFractionDigits: 0 }).format(value);
  const [loading, setLoading] = useState(true);
  const [quarterFilter, setQuarterFilter] = useState<QuarterFilter>('All');
  const [chartMode, setChartMode] = useState<ChartMode>('expenses');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const [fullYearData, setFullYearData] = useState<ChartDatum[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategorySpending[]>([]);
  const compactNumberFormatter = useMemo(
    () => new Intl.NumberFormat(getLanguageLocale(language), { notation: 'compact', maximumFractionDigits: 1 }),
    [language]
  );

  const fetchAnalyticsData = useCallback(async () => {
    if (!user) {
      setFullYearData([]);
      setCategoryBreakdown([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const start = startOfYear(new Date(selectedYear, 0, 1)).toISOString();
      const end = endOfYear(new Date(selectedYear, 11, 31)).toISOString();
      const prevStart = startOfYear(subYears(new Date(selectedYear, 0, 1), 1)).toISOString();
      const prevEnd = endOfYear(subYears(new Date(selectedYear, 11, 31), 1)).toISOString();

      const [
        currentTransactionsResult,
        previousTransactionsResult,
        budgetsResult,
        completedGoalsResult,
      ] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, type, date, category:categories(name, color, translations)')
          .eq('user_id', user.id)
          .gte('date', start)
          .lte('date', end),
        supabase
          .from('transactions')
          .select('amount, type, date')
          .eq('user_id', user.id)
          .gte('date', prevStart)
          .lte('date', prevEnd),
        supabase
          .from('budgets')
          .select('start_date')
          .eq('user_id', user.id)
          .gte('start_date', start)
          .lte('start_date', end),
        supabase
          .from('savings_goals')
          .select('name, target_amount, completed_at')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .gte('completed_at', start)
          .lte('completed_at', end),
      ]);

      const currentTransactions = currentTransactionsResult.data || [];
      const previousTransactions = previousTransactionsResult.data || [];
      const budgetStarts = new Set(
        (budgetsResult.data || [])
          .map((budget) => budget.start_date)
          .filter(Boolean)
          .map((value) => format(new Date(value as string), 'MMM'))
      );
      const completedGoals = completedGoalsResult.data || [];

      const expenseTransactions = currentTransactions.filter((tx) => tx.type === 'expense' && !tx.savings_goal_id);
      const savingsTransactions = currentTransactions.filter((tx) => tx.type === 'expense' && getTransactionCategoryName(tx) === 'Savings');
      const incomeTransactions = currentTransactions.filter((tx) => tx.type === 'income');
      const localeMap: Record<string, typeof bn> = { bn, ja };
      const locale = localeMap[language] || undefined;
      const monthNames = Array.from({ length: 12 }, (_, i) =>
        format(new Date(2000, i, 1), 'MMM', { locale })
      );

      let savingsRunningTotal = 0;
      const currentYearData = monthNames.map((monthName, monthIndex) => {
        const monthExpenses = expenseTransactions.filter((tx) => new Date(tx.date).getMonth() === monthIndex);
        const monthSavings = savingsTransactions.filter((tx) => new Date(tx.date).getMonth() === monthIndex);
        const monthSavingsAmount = monthSavings.reduce((sum, tx) => sum + Number(tx.amount), 0);
        savingsRunningTotal += monthSavingsAmount;

        const categories: Record<string, number> = {};
        monthExpenses.forEach((tx) => {
          const categoryName = getTransactionCategoryName(tx);
          categories[categoryName] = (categories[categoryName] || 0) + Number(tx.amount);
        });

        return {
          month: monthName,
          amount: monthExpenses.reduce((sum, tx) => sum + Number(tx.amount), 0),
          savingsAmount: monthSavingsAmount,
          incomeAmount: incomeTransactions
            .filter((tx) => new Date(tx.date).getMonth() === monthIndex)
            .reduce((sum, tx) => sum + Number(tx.amount), 0),
          cumulativeSavings: savingsRunningTotal,
          year: selectedYear,
          topCategory: Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0],
          comparisonAmount: previousTransactions
            .filter((tx) => tx.type === 'expense' && !tx.savings_goal_id && new Date(tx.date).getMonth() === monthIndex)
            .reduce((sum, tx) => sum + Number(tx.amount), 0),
          completedGoals: completedGoals
            .filter((goal) => new Date(goal.completed_at as string).getMonth() === monthIndex)
            .map((goal) => ({ name: goal.name, amount: Number(goal.target_amount) })),
          budgetMarker: budgetStarts.has(monthName),
        } satisfies ChartDatum;
      });

      setFullYearData(currentYearData);

      const categoryMap: Record<string, { amount: number; color: string }> = {
        Savings: { amount: 0, color: SAVINGS_COLOR },
      };

      expenseTransactions.forEach((tx) => {
        const name = tx.category?.name || t('transaction.categoryOther');
        const color = name === 'Savings' ? SAVINGS_COLOR : tx.category?.color || '#6B7280';
        if (!categoryMap[name]) {
          categoryMap[name] = { amount: 0, color };
        }
        categoryMap[name].amount += Number(tx.amount);
      });

      const totalYearSpending = expenseTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0) || 1;
      setCategoryBreakdown(
        Object.entries(categoryMap)
          .map(([name, data]) => ({
            name,
            amount: data.amount,
            color: data.color,
            percentage: totalYearSpending > 0 ? (data.amount / totalYearSpending) * 100 : 0,
          }))
          .sort((a, b) => {
            if (a.name === 'Savings') return -1;
            if (b.name === 'Savings') return 1;
            return b.amount - a.amount;
          })
      );

      if (!currentYearData.some((entry) => entry.amount > 0 || entry.savingsAmount > 0 || entry.incomeAmount > 0)) {
        setFullYearData([]);
      }
    } catch (err) {
      console.error(err);
      setFullYearData([]);
      setCategoryBreakdown([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, user]);

  useEffect(() => {
    void fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const filteredData = useMemo(() => {
    switch (quarterFilter) {
      case 'Q1': return fullYearData.slice(0, 3);
      case 'Q2': return fullYearData.slice(3, 6);
      case 'Q3': return fullYearData.slice(6, 9);
      case 'Q4': return fullYearData.slice(9, 12);
      default: return fullYearData;
    }
  }, [fullYearData, quarterFilter]);

  const metrics = useMemo(() => {
    const totalThisYear = fullYearData.reduce((sum, entry) => sum + entry.amount, 0);
    const totalLastYear = fullYearData.reduce((sum, entry) => sum + (entry.comparisonAmount || 0), 0);
    const yoyGrowth = totalLastYear > 0 ? ((totalThisYear - totalLastYear) / totalLastYear) * 100 : 0;
    const avgMonthly = totalThisYear / 12;
    const currentMonthData = fullYearData.find((entry) => entry.month === format(new Date(), 'MMM'));
    const currentMonthAmount = currentMonthData?.amount || 0;
    const currentMonthSavings = currentMonthData?.savingsAmount || 0;
    const monthVsAvg = avgMonthly > 0 ? ((currentMonthAmount - avgMonthly) / avgMonthly) * 100 : 0;
    const topCat = categoryBreakdown[0] || { name: 'N/A', percentage: 0, amount: 0, color: '#6B7280' };

    const currentMonthIncome = currentMonthData?.incomeAmount || 0;
    const savingsRate = currentMonthIncome > 0 ? (currentMonthSavings / currentMonthIncome) * 100 : 0;

    return {
      totalThisYear,
      yoyGrowth,
      avgMonthly,
      currentMonthAmount,
      currentMonthSavings,
      monthVsAvg,
      topCat,
      currentMonthIncome,
      savingsRate,
    };
  }, [categoryBreakdown, fullYearData]);

  const savingsRateMetrics = useMemo(() => {
    const currentMonthKey = format(new Date(), 'MMM');
    const lastMonthKey = format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'MMM');

    const monthData = new Map(fullYearData.map((entry) => [entry.month, entry]));
    const currentSavings = monthData.get(currentMonthKey)?.savingsAmount || 0;
    const previousSavings = monthData.get(lastMonthKey)?.savingsAmount || 0;

    const currentMonthIncome = monthData.get(currentMonthKey)?.incomeAmount || 0;
    const previousMonthIncome = monthData.get(lastMonthKey)?.incomeAmount || 0;

    const currentRate = currentMonthIncome > 0 ? (currentSavings / currentMonthIncome) * 100 : 0;
    const previousRate = previousMonthIncome > 0 ? (previousSavings / previousMonthIncome) * 100 : 0;

    return {
      currentRate,
      previousRate,
      delta: currentRate - previousRate,
    };
  }, [fullYearData]);

  const insights = useMemo<AnalyticsInsight[]>(() => {
    const list: AnalyticsInsight[] = [];
    if (fullYearData.length === 0) return list;

    const highestExpenseMonth = [...fullYearData].sort((a, b) => b.amount - a.amount)[0];
    if (highestExpenseMonth.amount > 0) {
      list.push({
        icon: '💡',
        message: t('analytics.highestSpendingMonth', { month: highestExpenseMonth.month, amount: formatAmount(highestExpenseMonth.amount) }),
        type: 'info',
      });
    }

    if (metrics.currentMonthAmount > metrics.avgMonthly * 1.2) {
      list.push({
        icon: '⚠️',
        message: t('analytics.spendingAboveAverage', { percent: metrics.monthVsAvg.toFixed(0) }),
        type: 'warning',
      });
    }

    const bestSavingsMonth = [...fullYearData].sort((a, b) => b.savingsAmount - a.savingsAmount)[0];
    if (bestSavingsMonth.savingsAmount > 0) {
      list.push({
        icon: '💰',
        message: t('analytics.highestSavingsMonth', { month: bestSavingsMonth.month, amount: formatAmount(bestSavingsMonth.savingsAmount) }),
        type: 'success',
      });
    }

    return list.slice(0, 3);
  }, [t, formatAmount, fullYearData, metrics.avgMonthly, metrics.currentMonthAmount, metrics.monthVsAvg]);

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) {
      return null;
    }

    const data = payload[0].payload;
    const diff = data.comparisonAmount && data.comparisonAmount > 0
      ? ((data.amount - data.comparisonAmount) / data.comparisonAmount) * 100
      : 0;

    return (
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl p-3 shadow-2xl">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">{t('analytics.tooltipExpenses')}</span>
            <span className="text-sm font-bold text-foreground">{formatAmount(data.amount)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">{t('analytics.tooltipSavings')}</span>
            <span className="text-sm font-bold text-emerald-600">{formatAmount(data.savingsAmount)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-sm text-muted-foreground">{t('analytics.tooltipCumulativeSaved')}</span>
            <span className="text-sm font-bold text-foreground">{formatAmount(data.cumulativeSavings)}</span>
          </div>
          {data.completedGoals.length > 0 && (
            <div className="pt-1 mt-1 border-t border-border">
              {data.completedGoals.map((goal) => (
                <p key={goal.name} className="text-xs text-emerald-600">
                  {goal.name} completed · {formatAmount(goal.amount)}
                </p>
              ))}
            </div>
          )}
          <div className="pt-1 mt-1 border-t border-border flex justify-between gap-4">
            <span className="text-xs text-muted-foreground">{t('analytics.tooltipVsLastYear')}</span>
            <span className={cn('text-xs font-bold', diff > 0 ? 'text-destructive' : 'text-green-500')}>
              {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-muted/50 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-muted/50 rounded-2xl" />
      </div>
    );
  }

  if (fullYearData.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
        <p className="text-sm font-semibold text-foreground">{t('analytics.noAnalytics', { year: localizeYear(selectedYear) })}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('analytics.noAnalyticsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <motion.div className="bg-card/60 backdrop-blur-md border border-border p-4 rounded-2xl shadow-card flex flex-col justify-between overflow-hidden" whileHover={{ y: -2 }}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-tight truncate">{t('analytics.totalThisYear')}</span>
          <div className="mt-1 min-w-0">
            <h3 className="text-xl font-bold text-foreground truncate">{formatAmount(metrics.totalThisYear)}</h3>
            <p className={cn('text-xs font-medium flex items-center gap-1 mt-0.5 truncate', metrics.yoyGrowth > 0 ? 'text-destructive' : 'text-green-500')}>
              {metrics.yoyGrowth > 0 ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
              {t('analytics.vsLastYear', { value: Math.abs(metrics.yoyGrowth).toFixed(1) })}
            </p>
          </div>
        </motion.div>

        <motion.div className="bg-card/60 backdrop-blur-md border border-border p-4 rounded-2xl shadow-card flex flex-col justify-between overflow-hidden" whileHover={{ y: -2 }}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-tight truncate">{t('analytics.monthlyAverage')}</span>
          <div className="mt-1 min-w-0">
            <h3 className="text-xl font-bold text-foreground truncate">{formatAmount(metrics.avgMonthly)}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {t('analytics.thisMonth')}: <span className="font-bold text-foreground">{formatAmount(metrics.currentMonthAmount)}</span>
            </p>
          </div>
        </motion.div>

        <motion.div className="bg-card/60 backdrop-blur-md border border-border p-4 rounded-2xl shadow-card flex flex-col justify-between overflow-hidden" whileHover={{ y: -2 }}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-tight truncate">
            {t('analytics.savingsRate', { month: format(new Date(), 'MMM') })}
          </span>
          <div className="mt-1 min-w-0">
            <h3 className="text-xl font-bold text-emerald-600 truncate">{savingsRateMetrics.currentRate.toFixed(1)}%</h3>
            <p className={cn('text-xs mt-0.5 truncate', savingsRateMetrics.delta >= 0 ? 'text-emerald-600' : 'text-amber-600')}>
              {t('analytics.vsLastMonth', { value: `${savingsRateMetrics.delta >= 0 ? '+' : ''}${savingsRateMetrics.delta.toFixed(1)}` })}
            </p>
          </div>
        </motion.div>

        <motion.div className="bg-card/60 backdrop-blur-md border border-border p-4 rounded-2xl shadow-card flex flex-col justify-between overflow-hidden" whileHover={{ y: -2 }}>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-tight truncate">{t('analytics.topCategory')}</span>
          <div className="mt-1 min-w-0">
            <h3 className={cn('text-xl font-bold truncate', metrics.topCat.name === 'Savings' ? 'text-emerald-600' : 'text-primary')}>
              {metrics.topCat.name === 'Savings' ? t('categories.savings') : metrics.topCat.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              <span className="font-bold text-foreground">{metrics.topCat.percentage.toFixed(0)}%</span> {t('analytics.ofSpending')}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="bg-[hsl(var(--chart-bg))] rounded-2xl border border-[hsl(var(--chart-border))] shadow-xl p-4 overflow-hidden">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="bg-muted/30 p-1 rounded-full flex gap-1 w-fit">
            {QUARTER_OPTIONS.map((q) => (
              <button
                key={q}
                onClick={() => setQuarterFilter(q)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
                  quarterFilter === q ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="bg-muted/30 p-1 rounded-full flex gap-1 w-fit">
                {CHART_MODE_OPTIONS.map((mode) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all',
                  chartMode === mode ? 'bg-emerald-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t(`analytics.${mode === 'both' ? 'chartModeBoth' : mode === 'savings' ? 'chartModeSavings' : 'chartModeExpenses'}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 700 }}
                dy={15}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(val) => compactNumberFormatter.format(Number(val))}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />

              {filteredData.filter((entry) => entry.budgetMarker).map((entry) => (
                <ReferenceLine
                  key={`budget-${entry.month}`}
                  x={entry.month}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="2 4"
                  strokeOpacity={0.35}
                />
              ))}

              {(chartMode === 'expenses' || chartMode === 'both') && (
                <Bar
                  dataKey="amount"
                  radius={[6, 6, 0, 0]}
                  onClick={(data) => onMonthSelect?.(data.month)}
                  className="cursor-pointer"
                >
                  {filteredData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.month === selectedMonth ? 'url(#activeGradient)' : 'url(#barGradient)'}
                      fillOpacity={entry.month === selectedMonth ? 1 : 0.8}
                    />
                  ))}
                </Bar>
              )}

              {(chartMode === 'savings' || chartMode === 'both') && (
                <Line
                  type="monotone"
                  dataKey="cumulativeSavings"
                  stroke={SAVINGS_COLOR}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}

              {filteredData.flatMap((entry) => entry.completedGoals.map((goal) => ({ month: entry.month, value: entry.cumulativeSavings, key: `${entry.month}-${goal.name}` }))).map((marker) => (
                <ReferenceDot
                  key={marker.key}
                  x={marker.month}
                  y={marker.value}
                  r={4}
                  fill={SAVINGS_COLOR}
                  stroke="white"
                  strokeWidth={1.5}
                />
              ))}

              {filteredData.map((entry, index) => (
                <ReferenceDot
                  key={`dot-${index}`}
                  x={entry.month}
                  y={entry.comparisonAmount}
                  r={chartMode === 'expenses' ? 3 : 0}
                  fill="hsl(var(--muted-foreground))"
                  stroke="hsl(var(--chart-bg))"
                  strokeWidth={1}
                />
              ))}

              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur-md border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-500" /> {t('analytics.keyInsights')}
          </h4>
          {insights.length > 1 && (
            <button
              onClick={() => setShowAllInsights(!showAllInsights)}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              {showAllInsights ? t('analytics.showLess') : t('analytics.viewAll')}
            </button>
          )}
        </div>
        {(showAllInsights ? insights : insights.slice(0, 1)).map((insight, idx) => (
          <motion.div
            key={idx}
            className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl border border-border"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            layout
          >
            <span className="text-lg leading-none">{insight.icon}</span>
            <p className="text-sm text-foreground/90 leading-snug">{insight.message}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card/60 backdrop-blur-md border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <PieChart className="w-3.5 h-3.5 text-secondary" /> {t('analytics.categoryBreakdown')}
          </h4>
          {categoryBreakdown.length > 1 && (
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              {showAllCategories ? t('analytics.showLess') : t('analytics.viewAll')}
            </button>
          )}
        </div>

        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 italic">{t('analytics.noCategoryData')}</p>
        ) : (
          <div className="space-y-4">
            {(showAllCategories ? categoryBreakdown : categoryBreakdown.slice(0, 3)).map((cat) => (
              <motion.div
                key={cat.name}
                className="space-y-1.5 cursor-pointer group"
                whileHover={{ scale: 1.01 }}
                layout
              >
                <div className="flex justify-between items-end text-sm gap-2">
                  <span className="font-bold text-foreground/90 group-hover:text-foreground transition-colors truncate">{t(`categories.${cat.name}`, cat.name)}</span>
                  <span className="font-mono text-muted-foreground shrink-0">{formatPercent(cat.percentage)}% • {formatAmount(cat.amount)}</span>
                </div>
                <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.percentage}%` }}
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
