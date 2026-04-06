import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();

  const monthData = [
    {
      name: t('analytics.income'),
      [t('analytics.lastMonth')]: monthComparison.lastMonth.income,
      [t('analytics.thisMonth')]: monthComparison.currentMonth.income,
    },
    {
      name: t('analytics.expenses'),
      [t('analytics.lastMonth')]: monthComparison.lastMonth.expenses,
      [t('analytics.thisMonth')]: monthComparison.currentMonth.expenses,
    },
    {
      name: t('analytics.net'),
      [t('analytics.lastMonth')]: monthComparison.lastMonth.net,
      [t('analytics.thisMonth')]: monthComparison.currentMonth.net,
    },
  ];

  const yearData = [
    {
      name: t('analytics.income'),
      [t('analytics.lastYear')]: yearComparison.lastYear.income,
      [t('analytics.thisYear')]: yearComparison.currentYear.income,
    },
    {
      name: t('analytics.expenses'),
      [t('analytics.lastYear')]: yearComparison.lastYear.expenses,
      [t('analytics.thisYear')]: yearComparison.currentYear.expenses,
    },
    {
      name: t('analytics.net'),
      [t('analytics.lastYear')]: yearComparison.lastYear.net,
      [t('analytics.thisYear')]: yearComparison.currentYear.net,
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
      <div className="p-3 rounded-xl bg-muted/50 text-center card-3d">
        <p className="text-xs text-muted-foreground">{t('analytics.income')}</p>
        <p className="text-sm font-bold text-foreground mt-1 text-glow">
          {formatAmount(current.income)}
        </p>
        <div className={`flex items-center justify-center gap-1 mt-1 text-xs ${getTrendColor(changes.income)}`}>
          {getTrendIcon(changes.income)}
          <span>{changes.income > 0 ? '+' : ''}{changes.income.toFixed(0)}%</span>
        </div>
      </div>
      <div className="p-3 rounded-xl bg-muted/50 text-center card-3d">
        <p className="text-xs text-muted-foreground">{t('analytics.expenses')}</p>
        <p className="text-sm font-bold text-foreground mt-1 text-glow">
          {formatAmount(current.expenses)}
        </p>
        <div className={`flex items-center justify-center gap-1 mt-1 text-xs ${getTrendColor(changes.expenses, true)}`}>
          {getTrendIcon(-changes.expenses)}
          <span>{changes.expenses > 0 ? '+' : ''}{changes.expenses.toFixed(0)}%</span>
        </div>
      </div>
      <div className="p-3 rounded-xl bg-muted/50 text-center card-3d">
        <p className="text-xs text-muted-foreground">{t('analytics.net')}</p>
        <p className="text-sm font-bold text-foreground mt-1 text-glow">
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
    <Card className="bg-card shadow-card card-3d transition-all">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground text-glow">
          {t('analytics.comparisonAnalysis')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="month" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="month">{t('analytics.monthVsMonth')}</TabsTrigger>
            <TabsTrigger value="year">{t('analytics.yearVsYear')}</TabsTrigger>
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
                  <Bar dataKey={t('analytics.lastMonth')} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t('analytics.thisMonth')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                  <Bar dataKey={t('analytics.lastYear')} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={t('analytics.thisYear')} fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
