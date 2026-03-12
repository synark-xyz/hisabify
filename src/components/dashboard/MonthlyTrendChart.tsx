import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend, Area, AreaChart } from 'recharts';
import { useCurrency } from '@/hooks/useCurrency';
import type { Props as TooltipProps, Payload, ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

interface MonthlyTrendData {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const { formatAmount } = useCurrency();

  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-4 py-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: Payload<ValueType, NameType>, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground capitalize">{entry.name}:</span>
              <span className="text-sm font-semibold text-foreground">
                {formatAmount(Number(entry.value || 0))}
              </span>
            </div>
          ))}
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
      <h3 className="text-lg font-bold text-foreground mb-4">Monthly Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value) => <span className="text-foreground capitalize">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#incomeGradient)"
              dot={{ r: 4, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              fill="url(#expenseGradient)"
              dot={{ r: 4, fill: 'hsl(var(--accent))' }}
              activeDot={{ r: 6, fill: 'hsl(var(--accent))' }}
            />
            <Area
              type="monotone"
              dataKey="savings"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#savingsGradient)"
              dot={{ r: 4, fill: '#10B981' }}
              activeDot={{ r: 6, fill: '#10B981' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
