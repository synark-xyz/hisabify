import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useBudgets } from '@/hooks/useBudgets';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useCategories } from '@/hooks/useCategories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Category } from '@/types';

interface ChartData {
  month: string;
  budget: number;
  spent: number;
}

type BudgetHistoryCategory = Category & { category_type?: string | null };

export function BudgetHistoryChart() {
  const { t } = useTranslation();
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { getHistoricalBudgets } = useBudgets();
  const { currency, formatAmount } = useCurrency();
  const { categories: allCategories } = useCategories();

  // Filter out lend/owe categories for budget chart (budgets don't apply to these)
  const categories = allCategories.filter((cat) => {
    const catWithType = cat as BudgetHistoryCategory;
    return !['lend', 'owe'].includes(catWithType.category_type || '');
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const categoryId = selectedCategory === 'all' ? undefined : selectedCategory;
        const history = await getHistoricalBudgets(categoryId, 6);
        setData(history);
      } catch (err) {
        console.error('Error fetching budget history:', err);
        setData([]); // Set empty data on error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCategory, getHistoricalBudgets]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm">
              <span className="text-muted-foreground">{entry.dataKey === 'budget' ? t('budget.title') : t('budget.spent')}: </span>
              <span className={entry.dataKey === 'spent' ? 'text-primary font-medium' : 'text-foreground'}>
                {formatAmount(entry.value)}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some(d => d.budget > 0 || d.spent > 0);
  const formatYAxisTick = (value: number) => {
    const locale = currencyData[currency]?.locale || undefined;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatXAxisTick = (label: string) => {
    const [month, year] = label.split(' ');
    if (!month || !year) return label;
    return `${month} '${year.slice(-2)}`;
  };

  return (
    <Card className="rounded-3xl shadow-none border-none bg-accent/5 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-6 pt-6">
        <div>
          <CardTitle className="text-lg font-bold">{t('budget.financialMomentum')}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{t('budget.sixMonthTrend')}</p>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[140px] h-9 text-xs rounded-full border-0 bg-background shadow-sm hover:bg-muted/50 transition-colors">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl shadow-xl border-border/50">
            <SelectItem value="all" className="rounded-lg text-xs font-medium">✨ {t('expenses.allCategories')}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id} className="rounded-lg text-xs">
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="px-2 sm:px-4 pb-6">
        {hasData ? (
          <div className="h-[280px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 12, right: 12, left: 10, bottom: 24 }}>
                <defs>
                  <filter id="lineGlowPrimary" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="lineGlowMuted" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.35} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
                  tickMargin={16}
                  interval={0}
                  minTickGap={28}
                  tickFormatter={formatXAxisTick}
                  padding={{ left: 14, right: 14 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
                  width={56}
                  tickFormatter={formatYAxisTick}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  content={<CustomTooltip />}
                />
                <Line
                  dataKey="budget"
                  name={t('budget.title') as string}
                  type="monotone"
                  stroke="hsl(var(--muted-foreground) / 0.45)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={{ r: 3, strokeWidth: 0, fill: 'hsl(var(--muted-foreground) / 0.75)' }}
                  activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(var(--muted-foreground) / 0.95)' }}
                  filter="url(#lineGlowMuted)"
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
                <Line
                  dataKey="spent"
                  name={t('budget.spent') as string}
                  type="monotone"
                  stroke="hsl(var(--primary))"
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={{ r: 3.5, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                  filter="url(#lineGlowPrimary)"
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground bg-background/50 rounded-2xl border-2 border-dashed border-border/50 m-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <span className="text-xl">📉</span>
            </div>
            <p className="font-medium text-sm">{t('budget.noMomentumYet')}</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px] text-center">
              {t('budget.noMomentumDesc')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
