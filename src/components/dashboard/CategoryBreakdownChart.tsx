import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { CategorySpending } from '@/types';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/ui/icon-button';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie';

interface CategoryBreakdownChartProps {
  data: CategorySpending[];
  title?: string;
  onCategoryClick?: (categoryName: string) => void;
}

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
        outerRadius={outerRadius + 15}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        fillOpacity={0.2}
        cornerRadius={10}
        style={{ filter: `blur(4px)` }}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={8}
        style={{ filter: `drop-shadow(0 0 12px ${fill}90)` }}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={26} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={15} fontWeight="600">
        {payload.category}
      </text>
    </g>
  );
};

export function CategoryBreakdownChart({ data, title = "Category Breakdown", onCategoryClick }: CategoryBreakdownChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [clickAnimation, setClickAnimation] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { formatAmount } = useCurrency();
  const { t } = useTranslation();

  const chartData = data.map((item, index) => ({
    ...item,
    category: item.name,
    color: item.color || COLORS[index % COLORS.length],
  }));

  const handleSegmentClick = (_: unknown, index: number) => {
    setActiveIndex(index);
    setClickAnimation(true);
    setTimeout(() => setClickAnimation(false), 300);
  };

  const handleLabelClick = (index: number) => {
    setActiveIndex(index);
    setClickAnimation(true);
    setTimeout(() => setClickAnimation(false), 300);
  };

  return (
    // layout prop lets framer-motion smoothly animate card height when legend mounts/unmounts
    <motion.div
      layout
      className="w-full bg-card/50 backdrop-blur-md rounded-2xl p-6 border border-border/50 shadow-xl card-3d transition-colors"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: clickAnimation ? 0.98 : 1 }}
      transition={{ duration: 0.4, layout: { type: 'spring', stiffness: 300, damping: 30 } }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground">{t('analytics.categoryBreakdown', title)}</h3>
        <IconButton onClick={() => setIsExpanded(p => !p)} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </IconButton>
      </div>

      {/* h-64 matches sibling cards; active shape peak = center(128) + outerRadius(105)+15 = 248 < 256 → no clipping */}
      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={105}
              dataKey="amount"
              nameKey="category"
              onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
              onClick={handleSegmentClick}
              paddingAngle={3}
              cornerRadius={10}
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="transparent"
                  style={{
                    cursor: 'pointer',
                    filter: activeIndex === index ? `drop-shadow(0 0 12px ${entry.color}80)` : 'none',
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend fades in/out; layout on parent animates card height */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="grid grid-cols-2 gap-3 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {chartData.map((item, index) => (
              <motion.div
                key={item.category}
                className={cn(
                  'flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all border',
                  activeIndex === index
                    ? 'bg-accent/10 border-accent/30 translate-x-1'
                    : 'bg-muted/30 border-transparent hover:bg-muted/50'
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, scale: activeIndex === index ? 1.02 : 1 }}
                transition={{ delay: 0.05 * index }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 400, damping: 17 } }}
                onClick={() => handleLabelClick(index)}
              >
                <motion.div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-lg"
                  style={{
                    backgroundColor: item.color,
                    boxShadow: `0 0 10px ${item.color}60`,
                  }}
                  animate={{ scale: activeIndex === index ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.5, repeat: activeIndex === index ? Infinity : 0, repeatDelay: 1 }}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-sm font-bold truncate',
                    activeIndex === index ? 'text-accent text-glow' : 'text-foreground'
                  )}>
                    {t(`categories.${item.category}`, item.category)}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">{formatAmount(item.amount)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
