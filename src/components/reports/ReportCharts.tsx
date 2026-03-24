import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { ReportData } from "@/hooks/useReportData";
import { useCurrency } from "@/hooks/useCurrency";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

interface ReportChartsProps {
  reportData: ReportData;
}

type ActiveShapeProps = PieSectorDataItem & {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: { category: string; percentage: number };
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
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0 0 8px ${fill}80)` }}
      />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={20} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={12} fontWeight="500">
        {payload.category}
      </text>
    </g>
  );
};

export function ReportCharts({ reportData }: ReportChartsProps) {
  const { formatAmount, currencySymbol } = useCurrency();
  const [activeIndex, setActiveIndex] = useState(0);

  // Format daily data for chart (show every nth day if too many)
  const dailyData = reportData.dailyExpenses.length > 30
    ? reportData.dailyExpenses.filter((_, i) => i % Math.ceil(reportData.dailyExpenses.length / 30) === 0)
    : reportData.dailyExpenses;

  const formattedDailyData = dailyData.map((d) => ({
    ...d,
    dateLabel: format(parseISO(d.date), "MMM d"),
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Category Breakdown Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.categoryBreakdown.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape as (props: unknown) => React.ReactElement}
                    data={reportData.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="category"
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onClick={(_, index) => setActiveIndex(index)}
                  >
                    {reportData.categoryBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="transparent"
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatAmount(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend grid — no clipping, full text visible */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                {reportData.categoryBreakdown.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-left transition-colors",
                      activeIndex === index
                        ? "bg-accent/10 border-accent/30"
                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => setActiveIndex(index)}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <p className={cn("text-xs font-semibold truncate", activeIndex === index ? "text-foreground" : "text-foreground/80")}>{item.category}</p>
                      <p className="text-xs text-muted-foreground">{item.percentage.toFixed(0)}%</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No expense data for selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Performance Bar Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Budget Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.budgetPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={reportData.budgetPerformance}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => `${currencySymbol}${v}`} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => formatAmount(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="budgeted" name="Budget" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="spent" name="Spent" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No budget data for selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Expenses Area Chart */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Expenses & Income</CardTitle>
        </CardHeader>
        <CardContent>
          {formattedDailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={formattedDailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tickFormatter={(v) => `${currencySymbol}${v}`} />
                <Tooltip
                  formatter={(value: number) => formatAmount(value)}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="hsl(var(--chart-4))"
                  fill="hsl(var(--chart-4))"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data for selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
