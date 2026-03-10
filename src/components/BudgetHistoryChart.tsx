import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
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
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { getHistoricalBudgets } = useBudgets();
  const { currency } = useCurrency();
  const { categories: allCategories } = useCategories();
  const currencySymbol = currencyData[currency]?.symbol || '$';

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
              <span className="text-muted-foreground">{entry.dataKey === 'budget' ? 'Budget' : 'Spent'}: </span>
              <span className={entry.dataKey === 'spent' ? 'text-primary font-medium' : 'text-foreground'}>
                {currencySymbol}{entry.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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

  return (
    <Card className="rounded-3xl shadow-none border-none bg-accent/5 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 px-6 pt-6">
        <div>
          <CardTitle className="text-lg font-bold">Financial Momentum</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">6-month spending trend</p>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[140px] h-9 text-xs rounded-full border-0 bg-background shadow-sm hover:bg-muted/50 transition-colors">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl shadow-xl border-border/50">
            <SelectItem value="all" className="rounded-lg text-xs font-medium">✨ All Categories</SelectItem>
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
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                  tickFormatter={(value) => `${currencySymbol}${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  content={<CustomTooltip />}
                />
                <Bar
                  dataKey="budget"
                  name="Budget"
                  fill="hsl(var(--muted-foreground)/0.2)"
                  radius={[4, 4, 4, 4]}
                  barSize={12}
                />
                <Bar
                  dataKey="spent"
                  name="Spent"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 4, 4]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground bg-background/50 rounded-2xl border-2 border-dashed border-border/50 m-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <span className="text-xl">📉</span>
            </div>
            <p className="font-medium text-sm">No momentum yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px] text-center">
              Create budgets and track expenses to see your financial trend here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
