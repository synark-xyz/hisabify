import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DayOfWeekAnalysis } from '@/hooks/useAdvancedAnalytics';
import type { Payload } from 'recharts/types/component/DefaultTooltipContent';

interface DayOfWeekChartProps {
  data: DayOfWeekAnalysis[];
}

const dayColors = [
  'hsl(var(--destructive))', // Sunday
  'hsl(var(--primary))',     // Monday
  'hsl(var(--accent))',      // Tuesday
  'hsl(var(--primary))',     // Wednesday
  'hsl(var(--accent))',      // Thursday
  'hsl(var(--primary))',     // Friday
  'hsl(var(--destructive))', // Saturday
];

export function DayOfWeekChart({ data }: DayOfWeekChartProps) {
  const { formatAmount } = useCurrency();

  const chartData = data.map(d => ({
    ...d,
    name: d.dayName.slice(0, 3),
  }));

  const maxDay = data.reduce((max, d) => d.totalSpent > max.totalSpent ? d : max, data[0]);
  const minDay = data.filter(d => d.totalSpent > 0).reduce((min, d) => d.totalSpent < min.totalSpent ? d : min, data[0]);

  return (
    <Card className="bg-card shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">
          Spending by Day of Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            className="p-3 rounded-xl bg-destructive/10"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="text-xs text-muted-foreground">Highest Spending Day</p>
            <p className="font-semibold text-foreground mt-1">{maxDay?.dayName || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">
              {formatAmount(maxDay?.totalSpent || 0)}
            </p>
          </motion.div>
          <motion.div
            className="p-3 rounded-xl bg-emerald-500/10"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="text-xs text-muted-foreground">Lowest Spending Day</p>
            <p className="font-semibold text-foreground mt-1">{minDay?.dayName || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">
              {formatAmount(minDay?.totalSpent || 0)}
            </p>
          </motion.div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="name" 
                className="text-muted-foreground text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-muted-foreground text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number, _name: string, _props: Payload<number, string>) => [
                  formatAmount(value),
                  'Total Spent'
                ]}
                labelFormatter={(label: string) => {
                  const day = data.find(d => d.dayName.startsWith(label));
                  return day?.dayName || label;
                }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const day = data.find(d => d.dayName.startsWith(label));
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold text-foreground">{day?.dayName}</p>
                        <p className="text-sm text-muted-foreground">
                          Total: {formatAmount(day?.totalSpent || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Average: {formatAmount(day?.averageSpent || 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Transactions: {day?.transactionCount || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Share: {(day?.percentage || 0).toFixed(1)}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="totalSpent" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={dayColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction counts */}
        <div className="flex justify-between text-xs text-muted-foreground">
          {chartData.map((d, i) => (
            <div key={d.name} className="text-center">
              <p>{d.transactionCount}</p>
              <p className="text-[10px]">txns</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
