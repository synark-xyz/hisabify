import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, RefreshCw, Lock, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/UpgradeModal';
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
import { exportToCSV } from '@/lib/exportUtils';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { PremiumGuard } from '@/components/PremiumGuard';

export function AnalyticsPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 11)), // Extended to 12 months for better analysis
    to: endOfMonth(new Date()),
  });
  const { user } = useAuth();
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

  // Listen for transaction updates
  useEffect(() => {
    const handleUpdate = () => {
      refetch();
    };
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, [refetch]);

  const { isPremium, loading: subscriptionLoading } = useSubscription();

  // Advanced analytics hook
  const {
    spendingPatterns,
    insights,
    monthComparison,
    yearComparison,
    trendPrediction,
    heatMapData,
    dayOfWeekAnalysis,
  } = useAdvancedAnalytics(transactions);

  const handleExportCSV = () => {
    exportToCSV({ transactions, dateRange });
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
    <div className="min-h-screen bg-background pb-page-content fade-bottom-overlay">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.header
          className="flex items-center justify-between px-4 py-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 card-3d rounded-b-3xl"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </motion.div>
            <h1 className="text-xl font-bold text-foreground text-glow">Analytics Dashboard</h1>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="icon"
              onClick={refetch}
              disabled={loading}
              className="border-glow"
            >
              <RefreshCw className={`w-4 h-4 icon-glow ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </motion.div>
        </motion.header>

        <motion.main
          className="px-4 space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Date Range Selector */}
          <motion.section variants={itemVariants}>
            <DateRangeSelector
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onExportCSV={handleExportCSV}
            />
          </motion.section>

          {/* Summary Cards */}
          <motion.section variants={itemVariants}>
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
              </div>
            ) : (
              <SummaryCards
                totalExpenses={totalExpenses}
                totalIncome={totalIncome}
                netBalance={netBalance}
                budgetRemaining={budgetRemaining}
              />
            )}
          </motion.section>

          {/* Tabs for Overview vs Advanced */}
          <motion.section variants={itemVariants}>
            <Tabs defaultValue="insights" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted/50 p-1 rounded-2xl h-12 card-3d">
                <TabsTrigger value="insights" className="rounded-xl font-bold uppercase tracking-tight text-[10px] data-[state=active]:bg-card data-[state=active]:text-accent data-[state=active]:text-glow">Insights</TabsTrigger>
                <TabsTrigger value="overview" className="rounded-xl font-bold uppercase tracking-tight text-[10px] data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:text-glow">Overview</TabsTrigger>
                <TabsTrigger value="advanced" className="rounded-xl font-bold uppercase tracking-tight text-[10px] data-[state=active]:bg-card data-[state=active]:text-purple-500 data-[state=active]:text-glow relative overflow-hidden">
                  Advanced
                  {!isPremium && !subscriptionLoading && <Lock className="ml-1.5 w-3 h-3 text-muted-foreground/50" />}
                </TabsTrigger>
              </TabsList>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-6">
                <PremiumGuard featureName="AI Insights">
                  {loading ? (
                    <>
                      <Skeleton className="h-40 rounded-2xl" />
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-32 rounded-2xl" />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Insights Cards */}
                      <InsightsCards insights={insights} />

                      {/* Spending Patterns & Predictions */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SpendingPatternsCard patterns={spendingPatterns} />
                        <TrendPredictionChart prediction={trendPrediction} />
                      </div>
                    </>
                  )}
                </PremiumGuard>
              </TabsContent>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {loading ? (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Skeleton className="h-80 rounded-2xl" />
                      <Skeleton className="h-80 rounded-2xl" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Skeleton className="h-80 rounded-2xl" />
                      <Skeleton className="h-80 rounded-2xl" />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Charts Row 1 - Category Breakdown & Monthly Trend */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <CategoryBreakdownChart data={categoryData} />
                      <MonthlyTrendChart data={monthlyTrendData} />
                    </div>

                    {/* Charts Row 2 - Budget vs Actual & Spending by Category */}
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
                          <p className="text-foreground font-semibold">No Budgets Set</p>
                          <p className="text-muted-foreground text-sm text-center mt-1">
                            Create budgets to see how you're tracking
                          </p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => navigate('/budget')}
                          >
                            Create Budget
                          </Button>
                        </motion.div>
                      )}
                      <SpendingByCategoryChart data={categoryData} />
                    </div>

                    {/* Top Expenses Table */}
                    <TopExpensesTable transactions={transactions} />
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
                      {/* Comparison Charts */}
                      <ComparisonCharts
                        monthComparison={monthComparison}
                        yearComparison={yearComparison}
                      />

                      {/* Heat Map & Day of Week Analysis */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SpendingHeatMap data={heatMapData} />
                        <DayOfWeekChart data={dayOfWeekAnalysis} />
                      </div>
                    </>
                  )}
                </PremiumGuard>
              </TabsContent>
            </Tabs>
          </motion.section>
        </motion.main>
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        source="analytics_tab"
      />
    </div>
  );
}
