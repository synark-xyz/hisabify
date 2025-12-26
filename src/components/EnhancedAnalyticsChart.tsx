import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, LabelList } from 'recharts';
import { motion } from 'framer-motion';
import { MonthlySpending } from '@/types';

interface EnhancedAnalyticsChartProps {
  data: MonthlySpending[];
  selectedMonth?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-sm font-semibold text-foreground">
          ${payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function EnhancedAnalyticsChart({ data, selectedMonth }: EnhancedAnalyticsChartProps) {
  const maxAmount = Math.max(...data.map(d => d.amount));

  return (
    <motion.div
      className="w-full h-56 bg-card rounded-2xl p-4 shadow-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 30, right: 10, left: 10, bottom: 10 }}>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
            dy={8}
          />
          <YAxis hide domain={[0, maxAmount * 1.2]} />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar 
            dataKey="amount" 
            radius={[8, 8, 0, 0]} 
            maxBarSize={45}
            animationBegin={0}
            animationDuration={800}
          >
            <LabelList
              dataKey="amount"
              position="top"
              content={({ x, y, width, value, index }: any) => {
                const isSelected = data[index]?.month === selectedMonth;
                if (!isSelected && data[index]?.amount !== maxAmount) return null;
                return (
                  <text
                    x={x + width / 2}
                    y={y - 8}
                    fill="hsl(var(--foreground))"
                    fontSize={11}
                    fontWeight={600}
                    textAnchor="middle"
                  >
                    ${(value as number).toLocaleString()}
                  </text>
                );
              }}
            />
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.month === selectedMonth 
                    ? 'hsl(var(--primary))' 
                    : 'hsl(var(--muted))'
                }
                style={{
                  filter: entry.month === selectedMonth 
                    ? 'drop-shadow(0 4px 8px hsl(var(--primary) / 0.3))' 
                    : 'none',
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
