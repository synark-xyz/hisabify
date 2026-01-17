import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
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

interface ReportChartsProps {
  reportData: ReportData;
}

export function ReportCharts({ reportData }: ReportChartsProps) {
  const { formatAmount, currencySymbol } = useCurrency();

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
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={reportData.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="amount"
                  nameKey="category"
                  label={({ category, percentage }) =>
                    `${category} (${percentage.toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {reportData.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatAmount(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
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
                  stroke="hsl(142 76% 36%)"
                  fill="hsl(142 76% 36%)"
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
