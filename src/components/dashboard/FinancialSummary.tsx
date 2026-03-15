import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  date: string;
  currency_base?: string;
  convertedAmount?: number;
  savings_goal_id?: string | null;
  category?: {
    name?: string;
  } | null;
}

interface FinancialSummaryProps {
  transactions: Transaction[];
  selectedDate: Date;
  className?: string;
}

interface PeriodSummary {
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
}

interface ComparisonResult {
  value: number;
  percentage: number;
  isPositive: boolean;
  isIncrease: boolean;
}

export function FinancialSummary({
  transactions,
  selectedDate,
  className,
}: FinancialSummaryProps) {
  const { formatAmount } = useCurrency();

  // Calculate summaries for different periods
  const summaries = useMemo(() => {
    const calculatePeriod = (start: Date, end: Date): PeriodSummary => {
      const periodTransactions = transactions.filter((tx) => {
        const txDate = new Date(tx.date);
        return txDate >= start && txDate <= end;
      });

      const income = periodTransactions
        .filter((tx) => tx.type === 'income')
        .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0);

      const expense = periodTransactions
        .filter((tx) => (tx.type === 'expense' || tx.type === 'lend' || tx.type === 'owe') && !tx.savings_goal_id)
        .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0);

      return {
        income,
        expense,
        net: income - expense,
        transactionCount: periodTransactions.length,
      };
    };

    // Today
    const todayStart = startOfDay(selectedDate);
    const todayEnd = endOfDay(selectedDate);
    const today = calculatePeriod(todayStart, todayEnd);
    const yesterday = calculatePeriod(
      startOfDay(subDays(selectedDate, 1)),
      endOfDay(subDays(selectedDate, 1))
    );

    // This Week
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const thisWeek = calculatePeriod(weekStart, weekEnd);
    const lastWeek = calculatePeriod(
      startOfWeek(subWeeks(selectedDate, 1), { weekStartsOn: 1 }),
      endOfWeek(subWeeks(selectedDate, 1), { weekStartsOn: 1 })
    );

    // This Month
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const thisMonth = calculatePeriod(monthStart, monthEnd);
    const lastMonth = calculatePeriod(
      startOfMonth(subMonths(selectedDate, 1)),
      endOfMonth(subMonths(selectedDate, 1))
    );

    return {
      today,
      yesterday,
      thisWeek,
      lastWeek,
      thisMonth,
      lastMonth,
    };
  }, [transactions, selectedDate]);

  // Calculate comparison
  const getComparison = (current: number, previous: number): ComparisonResult => {
    const difference = current - previous;
    const percentage = previous === 0 ? 100 : (difference / previous) * 100;
    
    return {
      value: Math.abs(difference),
      percentage: Math.abs(percentage),
      isPositive: difference >= 0,
      isIncrease: difference > 0,
    };
  };

  const dailyComparison = getComparison(summaries.today.expense, summaries.yesterday.expense);
  const weeklyComparison = getComparison(summaries.thisWeek.expense, summaries.lastWeek.expense);
  const monthlyComparison = getComparison(summaries.thisMonth.expense, summaries.lastMonth.expense);

  const SummaryCard = ({
    title,
    period,
    comparison,
    icon: Icon,
    colorClass,
  }: {
    title: string;
    period: PeriodSummary;
    comparison: ComparisonResult;
    icon: React.ElementType;
    colorClass: string;
  }) => (
    <motion.div
      className="bg-card rounded-2xl p-4 shadow-card"
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', colorClass)}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {period.transactionCount} txn{period.transactionCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Main Metrics */}
      <div className="space-y-2 mb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Income</span>
          <span className="text-sm font-semibold text-emerald-500">
            {formatAmount(period.income)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Expense</span>
          <span className="text-sm font-semibold text-accent">
            {formatAmount(period.expense)}
          </span>
        </div>
        <div className="h-px bg-border/50" />
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-foreground">Net</span>
          <span className={cn(
            'text-base font-bold',
            period.net >= 0 ? 'text-emerald-500' : 'text-destructive'
          )}>
            {formatAmount(period.net)}
          </span>
        </div>
      </div>

      {/* Comparison */}
      <div className={cn(
        'flex items-center gap-1.5 text-xs rounded-lg p-2',
        comparison.isIncrease ? 'bg-destructive/10' : 'bg-emerald-500/10'
      )}>
        {comparison.isIncrease ? (
          <ArrowUpRight className="w-3.5 h-3.5 text-destructive" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
        )}
        <span className={cn(
          'font-medium',
          comparison.isIncrease ? 'text-destructive' : 'text-emerald-500'
        )}>
          {comparison.percentage.toFixed(1)}%
        </span>
        <span className="text-muted-foreground">
          ({comparison.isIncrease ? '+' : '-'}{formatAmount(comparison.value)})
        </span>
        <span className="text-muted-foreground ml-auto">vs previous</span>
      </div>
    </motion.div>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Financial Summary</h2>
        <span className="text-sm text-muted-foreground">
          {format(selectedDate, 'MMM dd, yyyy')}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Today"
          period={summaries.today}
          comparison={dailyComparison}
          icon={DollarSign}
          colorClass="bg-blue-500/20 text-blue-500"
        />
        <SummaryCard
          title="This Week"
          period={summaries.thisWeek}
          comparison={weeklyComparison}
          icon={Calendar}
          colorClass="bg-purple-500/20 text-purple-500"
        />
        <SummaryCard
          title="This Month"
          period={summaries.thisMonth}
          comparison={monthlyComparison}
          icon={TrendingUp}
          colorClass="bg-accent/20 text-accent"
        />
      </div>

      {/* Quick Insights */}
      <motion.div
        className="bg-card rounded-2xl p-4 shadow-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Insights</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Daily Average (This Month)</span>
            <span className="font-medium text-foreground">
              {formatAmount(summaries.thisMonth.expense / new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate())}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Monthly Savings Rate</span>
            <span className={cn(
              'font-medium',
              summaries.thisMonth.income > 0 ? 'text-emerald-500' : 'text-muted-foreground'
            )}>
              {summaries.thisMonth.income > 0
                ? `${(
                  transactions
                    .filter((tx) => {
                      const txDate = new Date(tx.date);
                      return txDate >= startOfMonth(selectedDate)
                        && txDate <= endOfMonth(selectedDate)
                        && tx.savings_goal_id
                        && tx.category?.name === 'Savings';
                    })
                    .reduce((sum, tx) => sum + (tx.convertedAmount || tx.amount), 0) / summaries.thisMonth.income
                * 100).toFixed(1)}%`
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Income/Expense Ratio</span>
            <span className="font-medium text-foreground">
              {summaries.thisMonth.expense > 0
                ? `${(summaries.thisMonth.income / summaries.thisMonth.expense).toFixed(2)}x`
                : 'N/A'}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
