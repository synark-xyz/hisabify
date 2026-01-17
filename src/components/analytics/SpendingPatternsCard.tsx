import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Flame, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { format } from 'date-fns';
import type { SpendingPattern } from '@/hooks/useAdvancedAnalytics';

interface SpendingPatternsCardProps {
  patterns: SpendingPattern;
}

export function SpendingPatternsCard({ patterns }: SpendingPatternsCardProps) {
  const { formatAmount } = useCurrency();

  const stats = [
    {
      label: 'Daily Average',
      value: formatAmount(patterns.dailyAverage),
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Weekly Average',
      value: formatAmount(patterns.weeklyAverage),
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: 'Monthly Average',
      value: formatAmount(patterns.monthlyAverage),
      icon: Calendar,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Spending Streak',
      value: `${patterns.spendingStreak} days`,
      icon: Flame,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <Card className="bg-card shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">
          Spending Patterns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                className="p-3 rounded-xl bg-muted/50"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-sm font-bold text-foreground">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>

        {patterns.mostExpensiveCategory && (
          <div className="p-3 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Most Expensive Category</p>
                <p className="font-semibold text-foreground flex items-center gap-2 mt-1">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: patterns.mostExpensiveCategory.color }}
                  />
                  {patterns.mostExpensiveCategory.name}
                </p>
              </div>
              <p className="text-lg font-bold text-foreground">
                {formatAmount(patterns.mostExpensiveCategory.amount)}
              </p>
            </div>
          </div>
        )}

        {patterns.mostExpensiveDay && (
          <div className="p-3 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Most Expensive Day</p>
                <p className="font-semibold text-foreground mt-1">
                  {format(new Date(patterns.mostExpensiveDay.date), 'MMM d, yyyy')}
                </p>
              </div>
              <p className="text-lg font-bold text-foreground">
                {formatAmount(patterns.mostExpensiveDay.amount)}
              </p>
            </div>
          </div>
        )}

        {patterns.unusualSpending.isUnusual && (
          <motion.div
            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Spending is {patterns.unusualSpending.percentageAboveNormal.toFixed(0)}% above normal
              </p>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
