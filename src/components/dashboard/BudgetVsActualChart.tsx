import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts';
import { useCurrency } from '@/hooks/useCurrency';

interface BudgetVsActualData {
  category: string;
  budget: number;
  actual: number;
  color?: string;
}

interface BudgetVsActualChartProps {
  data: BudgetVsActualData[];
}

export function BudgetVsActualChart({ data }: BudgetVsActualChartProps) {
  const { formatAmount } = useCurrency();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const budget = payload.find((p: any) => p.dataKey === 'budget')?.value || 0;
      const actual = payload.find((p: any) => p.dataKey === 'actual')?.value || 0;
      const diff = budget - actual;
      const isOver = diff < 0;

      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm text-muted-foreground">Budget:</span>
              <span className="text-sm font-semibold text-foreground">{formatAmount(budget)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-sm text-muted-foreground">Actual:</span>
              <span className="text-sm font-semibold text-foreground">{formatAmount(actual)}</span>
            </div>
            <div className={`text-xs font-medium ${isOver ? 'text-destructive' : 'text-emerald-500'}`}>
              {isOver ? 'Over budget by ' : 'Under budget by '}
              {formatAmount(Math.abs(diff))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="bg-card rounded-2xl p-6 shadow-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-bold text-foreground mb-4">Budget vs Actual</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value) => <span className="text-foreground capitalize">{value}</span>}
            />
            <Bar
              dataKey="budget"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
            <Bar
              dataKey="actual"
              fill="hsl(var(--accent))"
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
