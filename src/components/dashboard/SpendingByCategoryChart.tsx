import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useCurrency } from '@/hooks/useCurrency';
import { CategorySpending } from '@/types';

interface SpendingByCategoryChartProps {
  data: CategorySpending[];
}

// Get theme-aware colors from CSS variables
const getChartColors = () => {
  const root = getComputedStyle(document.documentElement);
  return [
    `hsl(${root.getPropertyValue('--chart-1')})`,
    `hsl(${root.getPropertyValue('--chart-2')})`,
    `hsl(${root.getPropertyValue('--chart-3')})`,
    `hsl(${root.getPropertyValue('--chart-4')})`,
    `hsl(${root.getPropertyValue('--chart-5')})`,
    `hsl(${root.getPropertyValue('--primary')})`,
    `hsl(${root.getPropertyValue('--secondary')})`,
    `hsl(${root.getPropertyValue('--accent')})`,
  ];
};

const COLORS = getChartColors();

export function SpendingByCategoryChart({ data }: SpendingByCategoryChartProps) {
  const { formatAmount } = useCurrency();

  const chartData = data
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map((item, index) => ({
      ...item,
      color: item.color || COLORS[index % COLORS.length],
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-semibold text-foreground">{data.category}</p>
          <p className="text-sm text-muted-foreground">{formatAmount(data.amount)}</p>
          <p className="text-xs text-muted-foreground">{data.percentage.toFixed(1)}% of total</p>
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
      <h3 className="text-lg font-bold text-foreground mb-4">Spending by Category</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 80, bottom: 0 }}
          >
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
            <Bar
              dataKey="amount"
              radius={[0, 4, 4, 0]}
              maxBarSize={25}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
