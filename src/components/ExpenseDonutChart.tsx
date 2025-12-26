import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { CategorySpending } from '@/types';
import { useState } from 'react';

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
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={22} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={13}>
        {payload.category}
      </text>
    </g>
  );
};

export function ExpenseDonutChart({ data }: ExpenseDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

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
      className="w-full bg-card rounded-2xl p-4 shadow-card"
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
              innerRadius={65}
              outerRadius={100}
              dataKey="amount"
              nameKey="category"
              onMouseEnter={onPieEnter}
              paddingAngle={2}
              cornerRadius={8}
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="transparent"
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - Grid layout for better alignment */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {chartData.map((item, index) => (
          <motion.div
            key={index}
            className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setActiveIndex(index)}
          >
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{item.category}</p>
              <p className="text-xs text-muted-foreground">${item.amount.toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
