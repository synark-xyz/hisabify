import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { MonthlySpending } from '@/types';

interface AnalyticsChartProps {
  data: MonthlySpending[];
  selectedMonth?: string;
}

export function AnalyticsChart({ data, selectedMonth }: AnalyticsChartProps) {
  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <YAxis hide />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.month === selectedMonth ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
