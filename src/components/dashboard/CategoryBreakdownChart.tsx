import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import { useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { CategorySpending } from '@/types';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie';
import type { Props as TooltipProps, Payload, ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

interface CategoryBreakdownChartProps {
  data: CategorySpending[];
  title?: string;
  onCategoryClick?: (categoryName: string) => void;
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

type ActiveShapeProps = PieSectorDataItem & {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: ChartCategoryDatum;
  percent: number;
};

const renderActiveShape = (props: ActiveShapeProps) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={8}
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={20} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={12}>
        {payload.category}
      </text>
    </g>
  );
};

export function CategoryBreakdownChart({ data, title = "Category Breakdown", onCategoryClick }: CategoryBreakdownChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { formatAmount } = useCurrency();

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const chartData = data.map((item, index) => ({
    ...item,
    category: item.name,
    color: item.color || COLORS[index % COLORS.length],
  }));

  const onPieClick = (_: unknown, index: number) => {
    if (onCategoryClick && chartData[index]) {
      onCategoryClick(chartData[index].category);
    }
  };

  const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const tooltipData = payload[0].payload as ChartCategoryDatum;
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-semibold text-foreground">{tooltipData.category}</p>
          <p className="text-sm text-muted-foreground">{formatAmount(tooltipData.amount)}</p>
          <p className="text-xs text-muted-foreground">{tooltipData.percentage.toFixed(1)}%</p>
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
      <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="amount"
              nameKey="category"
              onMouseEnter={onPieEnter}
              onClick={onPieClick}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {chartData.slice(0, 6).map((item, index) => (
          <motion.div
            key={item.category}
            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors"
            onClick={() => {
              setActiveIndex(index);
              onCategoryClick?.(item.category);
            }}
            whileHover={{ scale: 1.02 }}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-foreground truncate">{item.category}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
