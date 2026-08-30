import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import { ChartBar } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import { CategorySpending } from '@/types';
import type { Props as TooltipProps, ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

interface SpendingByCategoryChartProps {
  data: CategorySpending[];
  /** Renders the empty-state CTA. Omit to show the empty state without an action. */
  onAddExpense?: () => void;
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

type ChartCategoryDatum = CategorySpending & {
  category: string;
  color: string;
};

export function SpendingByCategoryChart({ data, onAddExpense }: SpendingByCategoryChartProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();

  const chartData = data
    .filter(item => Number(item.amount) > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map((item, index) => ({
      ...item,
      category: t(`categories.${item.name}`, item.name),
      color: item.color || COLORS[index % COLORS.length],
    }));

  // Recharts draws an empty axis frame with no data, so render a real empty state instead.
  const isEmpty = chartData.length === 0;

  const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const tooltipData = payload[0].payload as ChartCategoryDatum;
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-semibold text-foreground">{tooltipData.category}</p>
          <p className="text-sm text-muted-foreground">{formatAmount(tooltipData.amount)}</p>
          <p className="text-xs text-muted-foreground">{tooltipData.percentage.toFixed(1)}{t('dashboard.percentOfTotal')}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="bg-card rounded-2xl p-4 sm:p-6 shadow-card overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-bold text-foreground mb-4 truncate">{t('dashboard.spendingByCategory')}</h3>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center text-center py-10">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-3">
            <ChartBar className="w-8 h-8 text-muted-foreground/50" weight="duotone" />
          </div>
          <p className="text-foreground font-semibold">{t('analytics.noSpendingData')}</p>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            {t('analytics.noSpendingDataDesc')}
          </p>
          {onAddExpense && (
            <Button variant="outline" className="mt-4" onClick={onAddExpense}>
              {t('expenses.addExpense')}
            </Button>
          )}
        </div>
      ) : (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
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
              width={100}
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
      )}
    </motion.div>
  );
}
