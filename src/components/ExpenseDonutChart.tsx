import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { CategorySpending } from '@/types';
import { useState } from 'react';

interface ExpenseDonutChartProps {
  data: CategorySpending[];
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="hsl(var(--foreground))" className="text-xl font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="hsl(var(--muted-foreground))" className="text-sm">
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

  return (
    <div className="w-full">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="amount"
              nameKey="category"
              onMouseEnter={onPieEnter}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.category}</p>
              <p className="text-xs text-muted-foreground">${item.amount.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
