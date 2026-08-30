import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { ChartEmptyState } from "@/components/charts/ChartEmptyState";
import { ChartPie, TrendUp, Target, ChartLineUp } from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { localizeNumber } from "@/lib/i18nNumber";

interface ReportChartsProps {
  reportData: ReportData;
  /** Opens the add-transaction flow from an empty chart. */
  onAddTransaction?: (type: 'expense' | 'income') => void;
  /** Navigates to budget creation from the empty budget chart. */
  onCreateBudget?: () => void;
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
        {`${localizeNumber(percent * 100)}%`}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={12} fontWeight="500">
        {payload.category}
      </text>
    </g>
  );
};

export function ReportCharts({ reportData, onAddTransaction, onCreateBudget }: ReportChartsProps) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();
  const [activeIndex, setActiveIndex] = useState(0);
  const [incomeActiveIndex, setIncomeActiveIndex] = useState(0);

  // Format daily data for chart (show every nth day if too many)
  const dailyData = reportData.dailyExpenses.length > 30
    ? reportData.dailyExpenses.filter((_, i) => i % Math.ceil(reportData.dailyExpenses.length / 30) === 0)
    : reportData.dailyExpenses;

  const formattedDailyData = dailyData.map((d) => ({
    ...d,
    dateLabel: format(parseISO(d.date), "MMM d"),
  }));

  const categoryColors = reportData.categoryBreakdown.map((entry) => entry.color);
  const incomeCategoryColors = reportData.incomeCategoryBreakdown.map((entry) => entry.color);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 min-w-0 w-full">
      {/* Expense Category Breakdown Pie Chart */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('reports.charts.expensesByCategory')}</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {reportData.categoryBreakdown.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" minHeight={180}>
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
                        fill={categoryColors[index]}
                        stroke="transparent"
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

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
                      <p className="text-xs text-muted-foreground">{localizeNumber(item.percentage)}%</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
              <ChartEmptyState
                icon={<ChartPie className="w-8 h-8 text-muted-foreground/50" weight="duotone" />}
                title={t('reports.charts.noExpenseData')}
                description={t('reports.charts.noExpenseDataDesc')}
                actionLabel={t('expenses.addExpense')}
                onAction={onAddTransaction ? () => onAddTransaction('expense') : undefined}
              />
          )}
        </CardContent>
      </Card>

      {/* Income Category Breakdown Pie Chart */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('reports.charts.incomeSources')}</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {reportData.incomeCategoryBreakdown.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" minHeight={180}>
                <PieChart>
                  <Pie
                    activeIndex={incomeActiveIndex}
                    activeShape={renderActiveShape as (props: unknown) => React.ReactElement}
                    data={reportData.incomeCategoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="category"
                    onMouseEnter={(_, index) => setIncomeActiveIndex(index)}
                    onClick={(_, index) => setIncomeActiveIndex(index)}
                  >
                    {reportData.incomeCategoryBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={incomeCategoryColors[index]}
                        stroke="transparent"
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-2 mt-3">
                {reportData.incomeCategoryBreakdown.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-left transition-colors",
                      incomeActiveIndex === index
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                    )}
                    onMouseEnter={() => setIncomeActiveIndex(index)}
                    onClick={() => setIncomeActiveIndex(index)}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <p className={cn("text-xs font-semibold truncate", incomeActiveIndex === index ? "text-foreground" : "text-foreground/80")}>{item.category}</p>
                      <p className="text-xs text-muted-foreground">{localizeNumber(item.percentage)}%</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ChartEmptyState
              icon={<TrendUp className="w-8 h-8 text-muted-foreground/50" weight="duotone" />}
              title={t('reports.charts.noIncomeData')}
              description={t('reports.charts.noIncomeDataDesc')}
              actionLabel={t('expenses.addIncome')}
              onAction={onAddTransaction ? () => onAddTransaction('income') : undefined}
            />
          )}
        </CardContent>
      </Card>

      {/* Budget Performance Bar Chart */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('reports.charts.budgetPerformance')}</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {reportData.budgetPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" minHeight={220}>
              <BarChart
                data={reportData.budgetPerformance}
                layout="vertical"
                margin={{ left: 4, right: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => `${currencySymbol}${localizeNumber(v)}`} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip
                  formatter={(value: number) => formatAmount(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="budgeted" name={t('reports.charts.budget')} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="spent" name={t('reports.charts.spent')} fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmptyState
              icon={<Target className="w-8 h-8 text-muted-foreground/50" weight="duotone" />}
              title={t('reports.charts.noBudgetData')}
              description={t('reports.charts.noBudgetDataDesc')}
              actionLabel={t('analytics.createBudget')}
              onAction={onCreateBudget}
            />
          )}
        </CardContent>
      </Card>

      {/* Daily Expenses Area Chart */}
      <Card className="w-full md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('reports.charts.dailyExpensesIncome')}</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {formattedDailyData.length > 0 ? (
            <ResponsiveContainer width="100%" minHeight={280}>
              <AreaChart data={formattedDailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tickFormatter={(v) => `${currencySymbol}${localizeNumber(v)}`} />
                <Tooltip
                  formatter={(value: number) => formatAmount(value)}
                  labelFormatter={(label) => `${t('reports.charts.date')}: ${label}`}
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
                  name={t('reports.charts.expenses')}
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name={t('reports.charts.income')}
                  stroke="hsl(var(--chart-4))"
                  fill="hsl(var(--chart-4))"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmptyState
              icon={<ChartLineUp className="w-8 h-8 text-muted-foreground/50" weight="duotone" />}
              title={t('reports.charts.noData')}
              description={t('reports.charts.noDataDesc')}
              actionLabel={t('expenses.addExpense')}
              onAction={onAddTransaction ? () => onAddTransaction('expense') : undefined}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
