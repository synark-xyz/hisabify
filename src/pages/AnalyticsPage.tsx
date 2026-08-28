import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Crown, Share2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useSubscription } from '@/hooks/useSubscription';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { CategoryBreakdownChart } from '@/components/dashboard/CategoryBreakdownChart';
import { MonthlyTrendChart } from '@/components/dashboard/MonthlyTrendChart';
import { TopExpensesTable } from '@/components/dashboard/TopExpensesTable';
import { BudgetVsActualChart } from '@/components/dashboard/BudgetVsActualChart';
import { SpendingByCategoryChart } from '@/components/dashboard/SpendingByCategoryChart';
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector';
import {
  InsightsCards,
  SpendingPatternsCard,
  ComparisonCharts,
  TrendPredictionChart,
  SpendingHeatMap,
  DayOfWeekChart,
} from '@/components/analytics';
import { MonthlyWrapCard } from '@/components/MonthlyWrapCard';
import { exportToCSV } from '@/lib/exportUtils';
import { subMonths, startOfMonth, endOfMonth, getMonth, getYear } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { PremiumGuard } from '@/components/PremiumGuard';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function AnalyticsPage() {
  const [showWrapModal, setShowWrapModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 11)),
    to: endOfMonth(new Date()),
  });
  const { user } = useAuth();
  const { currency, formatAmount } = useCurrency();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    transactions,
    totalExpenses,
    totalIncome,
    netBalance,
    budgetRemaining,
    categoryData,
    monthlyTrendData,
    budgetVsActualData,
    loading,
    refetch,
  } = useDashboardData(dateRange);
  const hasTransactionData = transactions.length > 0;

  const { isPremium } = useSubscription();

  const {
    spendingPatterns,
    insights,
    monthComparison,
    yearComparison,
    trendPrediction,
    heatMapData,
    dayOfWeekAnalysis,
  } = useAdvancedAnalytics(transactions);

  const handleExportCSV = async () => {
    await exportToCSV({ transactions, dateRange });
  };

  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    setDateRange(range);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <>
      <PullToRefresh onRefresh={async () => { await refetch(); }}>
        <div className="max-w-6xl mx-auto overflow-x-hidden">
          <motion.main
            className="px-4 pt-2 pb-8 md:pt-4 md:pb-12 overflow-x-hidden"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Action Bar */}
            <motion.div variants={itemVariants} className="flex items-center justify-end mb-6">
              <DateRangeSelector
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                onExportCSV={handleExportCSV}
                onRefresh={refetch}
                isRefreshing={loading}
              />
            </motion.div>

            {/* Summary Cards */}
            <motion.div variants={itemVariants}>
              <SummaryCards
                 totalExpenses={totalExpenses}
                 totalIncome={totalIncome}
                 netBalance={netBalance}
                 budgetRemaining={budgetRemaining}
               />
            </motion.div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="mb-6 grid grid-cols-3 w-full lg:w-auto lg:grid-cols-3 gap-1 p-1 bg-card/50 rounded-xl">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">{t('analytics.overview')}</TabsTrigger>
                <TabsTrigger value="insights" className="text-xs sm:text-sm">{t('analytics.insights')}</TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs sm:text-sm">{t('analytics.advanced')}</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div variants={itemVariants}>
                    {loading ? (
                      <Skeleton className="h-80 rounded-2xl" />
                    ) : (
                      <CategoryBreakdownChart data={categoryData} />
                    )}
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    {loading ? (
                      <Skeleton className="h-80 rounded-2xl" />
                    ) : (
                      <MonthlyTrendChart data={monthlyTrendData} />
                    )}
                  </motion.div>
                </div>

                {/* Budget vs Actual & Spending by Category */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {budgetVsActualData.length > 0 ? (
                    <BudgetVsActualChart data={budgetVsActualData} />
                  ) : (
                    <motion.div
                      className="bg-card rounded-2xl p-6 shadow-card flex flex-col items-center justify-center h-80"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <span className="text-5xl mb-3">💰</span>
                      <p className="text-foreground font-semibold">{t('analytics.noBudgetsSet')}</p>
                      <p className="text-muted-foreground text-sm text-center mt-1">
                        {t('analytics.noBudgetsDesc')}
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate('/budget')}
                      >
                        {t('analytics.createBudget')}
                      </Button>
                    </motion.div>
                  )}
                  <SpendingByCategoryChart data={categoryData} />
                </div>

                {/* Top Expenses Table */}
                <TopExpensesTable transactions={transactions} />
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-6">
                {loading ? (
                  <>
                    <Skeleton className="h-80 rounded-2xl" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Skeleton className="h-80 rounded-2xl" />
                      <Skeleton className="h-80 rounded-2xl" />
                    </div>
                  </>
                ) : (
                  <>
                    <InsightsCards insights={insights} />
                    <SpendingPatternsCard patterns={spendingPatterns} />
                  </>
                )}
              </TabsContent>

              {/* Advanced Tab */}
              <TabsContent value="advanced" className="space-y-6">
                <PremiumGuard featureName="Advanced Analytics">
                  {loading ? (
                    <>
                      <Skeleton className="h-80 rounded-2xl" />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Skeleton className="h-80 rounded-2xl" />
                        <Skeleton className="h-80 rounded-2xl" />
                      </div>
                    </>
                  ) : (
                    <>
                      <ComparisonCharts
                        monthComparison={monthComparison}
                        yearComparison={yearComparison}
                      />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SpendingHeatMap data={heatMapData} />
                        <DayOfWeekChart data={dayOfWeekAnalysis} />
                      </div>
                    </>
                  )}
                </PremiumGuard>
              </TabsContent>
            </Tabs>
          </motion.main>
        </div>
      </PullToRefresh>

      {/* Monthly Wrap Modal */}
      <AnimatePresence>
        {showWrapModal && (
          <motion.div
            className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowWrapModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-sm"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            >
              <button
                onClick={() => setShowWrapModal(false)}
                className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <MonthlyWrapCard
                month={getMonth(dateRange.to) + 1}
                year={getYear(dateRange.to)}
                totalSaved={netBalance}
                budgetWeeksUnder={budgetVsActualData.filter((b) => (b.actual ?? 0) <= (b.budget ?? 0)).length}
                expenseStreak={transactions.length > 0 ? Math.min(transactions.length, 30) : 0}
                currency={currency}
                formattedTotalSaved={formatAmount(Math.abs(netBalance))}
                formattedTotalExpenses={formatAmount(totalExpenses)}
                formattedTotalIncome={formatAmount(totalIncome)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
