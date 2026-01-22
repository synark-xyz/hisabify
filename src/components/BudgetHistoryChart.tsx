import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { useBudgets } from '@/hooks/useBudgets';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types';

interface ChartData {
  month: string;
  budget: number;
  spent: number;
}

export function BudgetHistoryChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);

  const { getHistoricalBudgets } = useBudgets();
  const { currency } = useCurrency();
  const currencySymbol = currencyData[currency]?.symbol || '$';

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) setCategories(data as Category[]);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const categoryId = selectedCategory === 'all' ? undefined : selectedCategory;
      const history = await getHistoricalBudgets(categoryId, 6);
      setData(history);
      setLoading(false);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-end space-y-0 pb-2">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(value) => `${currencySymbol}${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-foreground">{value === 'budget' ? 'Budget' : 'Spent'}</span>}
              />
              <Bar
                dataKey="budget"
                fill="hsl(var(--muted-foreground))"
                radius={[4, 4, 0, 0]}
                name="budget"
              />
              <Bar
                dataKey="spent"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                name="spent"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>No budget history available. Create a budget to start tracking!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
