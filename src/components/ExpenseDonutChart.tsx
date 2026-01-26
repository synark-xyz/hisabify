import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { CategorySpending } from '@/types';
import { useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

interface ExpenseDonutChartProps {
  data: CategorySpending[];
}

const COLORS = ['#5B4B8A', '#F97316', '#3B4B6B', '#7B6BA8', '#10B981', '#F59E0B'];

const renderActiveShape = (props: any) => {
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
        style={{ filter: `drop-shadow(0 0 8px ${fill}80)` }}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={24} fontWeight="bold" className="text-glow">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={14} fontWeight="medium">
        {payload.name}
      </text>
    </g>
  );
};

export function ExpenseDonutChart({ data }: ExpenseDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { formatAmount } = useCurrency();

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  // Assign colors if not already set
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || COLORS[index % COLORS.length],
  }));

  return (
    <motion.div
      className="w-full bg-card/50 backdrop-blur-md rounded-2xl p-6 border border-border/50 shadow-xl card-3d transition-all"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="h-72 relative">
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
              nameKey="name"
              onMouseEnter={onPieEnter}
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
                    filter: activeIndex === index ? `drop-shadow(0 0 12px ${entry.color}80)` : 'none'
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - Grid layout for better alignment */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        {chartData.map((item, index) => (
          <motion.div
            key={index}
            className={cn(
              "flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all border",
              activeIndex === index
                ? "bg-accent/10 border-accent/30 translate-x-1"
                : "bg-muted/30 border-transparent hover:bg-muted/50"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setActiveIndex(index)}
          >
            <div
              className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-lg"
              style={{
                backgroundColor: item.color,
                boxShadow: `0 0 10px ${item.color}60`
              }}
            />
            <div className="min-w-0 flex-1">
              <p className={cn(
                "text-sm font-bold truncate",
                activeIndex === index ? "text-accent text-glow" : "text-foreground"
              )}>{item.name}</p>
              <p className="text-xs font-medium text-muted-foreground">{formatAmount(item.amount)}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
