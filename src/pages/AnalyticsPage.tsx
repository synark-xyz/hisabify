import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { CategoryBreakdownChart } from '@/components/dashboard/CategoryBreakdownChart';
import { MonthlyTrendChart } from '@/components/dashboard/MonthlyTrendChart';
import { TopExpensesTable } from '@/components/dashboard/TopExpensesTable';
import { BudgetVsActualChart } from '@/components/dashboard/BudgetVsActualChart';
import { SpendingByCategoryChart } from '@/components/dashboard/SpendingByCategoryChart';
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector';
import { exportToCSV } from '@/lib/exportUtils';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function AnalyticsPage() {
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 5)),
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
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.header
          className="flex items-center justify-between px-4 py-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </motion.div>
            <h1 className="text-xl font-bold text-foreground">Analytics Dashboard</h1>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="icon"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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

          {/* Charts Row 1 - Category Breakdown & Monthly Trend */}
          <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading ? (
              <>
                <Skeleton className="h-80 rounded-2xl" />
                <Skeleton className="h-80 rounded-2xl" />
              </>
            ) : (
              <>
                <CategoryBreakdownChart data={categoryData} />
                <MonthlyTrendChart data={monthlyTrendData} />
              </>
            )}
          </motion.section>

          {/* Charts Row 2 - Budget vs Actual & Spending by Category */}
          <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading ? (
              <>
                <Skeleton className="h-80 rounded-2xl" />
                <Skeleton className="h-80 rounded-2xl" />
              </>
            ) : (
              <>
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
              </>
            )}
          </motion.section>

          {/* Top Expenses Table */}
          <motion.section variants={itemVariants}>
            {loading ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : (
              <TopExpensesTable transactions={transactions} />
            )}
          </motion.section>
        </motion.main>
      </div>

      <BottomNavigation onAddClick={() => setShowAddTransaction(true)} />

      <AddTransactionModal
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        onSuccess={refetch}
      />
    </div>
  );
}
