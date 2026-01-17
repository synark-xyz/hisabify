import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrency } from '@/hooks/useCurrency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MonthComparison, YearComparison } from '@/hooks/useAdvancedAnalytics';

interface ComparisonChartsProps {
  monthComparison: MonthComparison;
  yearComparison: YearComparison;
}

export function ComparisonCharts({ monthComparison, yearComparison }: ComparisonChartsProps) {
  const { formatAmount } = useCurrency();

  const monthData = [
    {
      name: 'Income',
      'Last Month': monthComparison.lastMonth.income,
      'This Month': monthComparison.currentMonth.income,
    },
    {
      name: 'Expenses',
      'Last Month': monthComparison.lastMonth.expenses,
      'This Month': monthComparison.currentMonth.expenses,
    },
    {
      name: 'Net',
      'Last Month': monthComparison.lastMonth.net,
      'This Month': monthComparison.currentMonth.net,
    },
  ];

  const yearData = [
    {
      name: 'Income',
      'Last Year': yearComparison.lastYear.income,
      'This Year': yearComparison.currentYear.income,
    },
    {
      name: 'Expenses',
      'Last Year': yearComparison.lastYear.expenses,
      'This Year': yearComparison.currentYear.expenses,
    },
    {
      name: 'Net',
      'Last Year': yearComparison.lastYear.net,
      'This Year': yearComparison.currentYear.net,
    },
  ];

  const getTrendIcon = (change: number) => {
    if (change > 5) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (change < -5) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = (change: number, isExpense: boolean = false) => {
    if (isExpense) {
      return change > 0 ? 'text-destructive' : 'text-emerald-500';
    }
    return change > 0 ? 'text-emerald-500' : 'text-destructive';
  };

  const renderComparisonStats = (
    current: { income: number; expenses: number; net: number },
    changes: { income: number; expenses: number; net: number },
    label: string
  ) => (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="p-3 rounded-xl bg-muted/50 text-center">
        <p className="text-xs text-muted-foreground">Income</p>
        <p className="text-sm font-bold text-foreground mt-1">
          {formatAmount(current.income)}
        </p>
        <div className={`flex items-center justify-center gap-1 mt-1 text-xs ${getTrendColor(changes.income)}`}>
          {getTrendIcon(changes.income)}
          <span>{changes.income > 0 ? '+' : ''}{changes.income.toFixed(0)}%</span>
        </div>
      </div>
      <div className="p-3 rounded-xl bg-muted/50 text-center">
        <p className="text-xs text-muted-foreground">Expenses</p>
        <p className="text-sm font-bold text-foreground mt-1">
          {formatAmount(current.expenses)}
        </p>
        <div className={`flex items-center justify-center gap-1 mt-1 text-xs ${getTrendColor(changes.expenses, true)}`}>
          {getTrendIcon(-changes.expenses)}
          <span>{changes.expenses > 0 ? '+' : ''}{changes.expenses.toFixed(0)}%</span>
        </div>
      </div>
      <div className="p-3 rounded-xl bg-muted/50 text-center">
        <p className="text-xs text-muted-foreground">Net</p>
        <p className="text-sm font-bold text-foreground mt-1">
          {formatAmount(current.net)}
        </p>
        <div className={`flex items-center justify-center gap-1 mt-1 text-xs ${getTrendColor(changes.net)}`}>
          {getTrendIcon(changes.net)}
          <span>{changes.net > 0 ? '+' : ''}{changes.net.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="bg-card shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">
          Comparison Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="month" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="month">Month vs Month</TabsTrigger>
            <TabsTrigger value="year">Year vs Year</TabsTrigger>
          </TabsList>
          
          <TabsContent value="month">
            {renderComparisonStats(
              monthComparison.currentMonth,
              monthComparison.percentageChange,
              'This Month'
            )}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    className="text-muted-foreground text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-muted-foreground text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatAmount(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="Last Month" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="This Month" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="year">
            {renderComparisonStats(
              yearComparison.currentYear,
              yearComparison.percentageChange,
              'This Year'
            )}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    className="text-muted-foreground text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-muted-foreground text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatAmount(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="Last Year" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="This Year" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
