import { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { eachDayOfInterval, format, isAfter, parseISO, eachMonthOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { BudgetWithSpending } from '@/hooks/useBudgets';

interface DayData {
  label: string;
  daily: number;
  cumulative: number;
}

const EMPTY_PATTERN = [28, 14, 42, 8, 55, 18, 35, 22, 48, 12];

function EmptyChart() {
  return (
    <div className="mt-3 flex h-[100px] items-end gap-[3px] px-1 opacity-[0.12]">
      {EMPTY_PATTERN.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-muted-foreground"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

interface Props {
  budget: BudgetWithSpending;
}

export function BudgetSpendingChart({ budget }: Props) {
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { currency } = useCurrency();
  const { convertAmount } = useExchangeRate();

  const statusColor =
    budget.status === 'exceeded'
      ? 'hsl(var(--destructive))'
      : budget.status === 'warning'
        ? 'hsl(45, 93%, 47%)'
        : 'hsl(142, 76%, 36%)'; // green for safe / utilized

  const fetchChartData = useCallback(async () => {
    if (!budget.start_date || !user) return;

    setLoading(true);
    try {
      const { data: txs } = await supabase
        .from('transactions')
        .select('amount, currency_base, date')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('budget_id', budget.id);

      const startDate = parseISO(budget.start_date);
      const endDate = budget.end_date ? parseISO(budget.end_date) : new Date();
      const today = new Date();
      const effectiveEnd = isAfter(endDate, today) ? today : endDate;

      if (isAfter(startDate, effectiveEnd)) {
        setChartData([]);
        return;
      }

      // Build per-day spending map
      const dailyMap = new Map<string, number>();
      for (const tx of txs || []) {
        const txDay = format(new Date(tx.date), 'yyyy-MM-dd');
        const stored = (tx.currency_base as string) || 'USD';
        let amount = Number(tx.amount);
        if (stored !== currency) {
          const result = await convertAmount(amount, stored, currency);
          if (result) amount = result.convertedAmount;
        }
        dailyMap.set(txDay, (dailyMap.get(txDay) || 0) + amount);
      }

      let data: DayData[];

      if (budget.period_type === 'yearly') {
        // Aggregate to monthly buckets for yearly budgets
        const months = eachMonthOfInterval({ start: startDate, end: effectiveEnd });
        let cumulative = 0;
        data = months.map((month) => {
          const prefix = format(month, 'yyyy-MM');
          let daily = 0;
          for (const [key, val] of dailyMap.entries()) {
            if (key.startsWith(prefix)) daily += val;
          }
          cumulative += daily;
          return { label: format(month, 'MMM'), daily, cumulative };
        });
      } else {
        // Daily buckets for weekly / monthly budgets
        const days = eachDayOfInterval({ start: startDate, end: effectiveEnd });
        let cumulative = 0;
        data = days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const daily = dailyMap.get(dayKey) || 0;
          cumulative += daily;
          return {
            label: budget.period_type === 'weekly'
              ? format(day, 'EEE')
              : format(day, 'd'),
            daily,
            cumulative,
          };
        });
      }

      setChartData(data);
    } finally {
      setLoading(false);
    }
  }, [budget, user, currency, convertAmount]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  if (loading || chartData.length === 0) {
    return <EmptyChart />;
  }

  const hasAnySpend = chartData.some((d) => d.daily > 0);
  if (!hasAnySpend) return <EmptyChart />;

  const xInterval =
    budget.period_type === 'weekly'
      ? 0
      : budget.period_type === 'monthly'
        ? Math.max(1, Math.floor(chartData.length / 6))
        : 'preserveStartEnd';

  return (
    <div className="mt-3 h-[110px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 2, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            interval={xInterval}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '11px',
              padding: '6px 10px',
            }}
            formatter={(value: number, name: string) => [
              value.toLocaleString(undefined, { maximumFractionDigits: 0 }),
              name === 'cumulative' ? 'Total so far' : 'Daily',
            ]}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}
          />
          {/* Budget limit reference line */}
          <ReferenceLine
            y={budget.amount}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.5}
          />
          {/* Daily spend bars */}
          <Bar
            dataKey="daily"
            fill={statusColor}
            radius={[2, 2, 0, 0]}
            opacity={0.65}
            maxBarSize={18}
          />
          {/* Cumulative spend line */}
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke={statusColor}
            strokeWidth={1.5}
            dot={false}
            strokeLinecap="round"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
