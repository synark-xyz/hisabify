import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WeekCalendar } from '@/components/WeekCalendar';
import { ExpenseDonutChart } from '@/components/ExpenseDonutChart';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, CategorySpending } from '@/types';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay } from 'date-fns';

export function AnalyticsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, currentDate]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    const start = startOfMonth(currentDate).toISOString();
    const end = endOfMonth(currentDate).toISOString();
    
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', start)
      .lte('date', end);

    if (data) setTransactions(data as unknown as Transaction[]);
  };

  const hasTransactions = (date: Date) => {
    return transactions.some(tx => isSameDay(new Date(tx.date), date));
  };

  const totalExpense = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

  const categoryData: CategorySpending[] = Object.values(
    transactions.reduce((acc, tx) => {
      const catName = tx.category?.name || 'Other';
      const catColor = tx.category?.color || '#6B7280';
      
      if (!acc[catName]) {
        acc[catName] = { category: catName, amount: 0, color: catColor, percentage: 0 };
      }
      acc[catName].amount += Number(tx.amount);
      return acc;
    }, {} as Record<string, CategorySpending>)
  ).map(cat => ({
    ...cat,
    percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0,
  }));

  const salaryPercentage = totalExpense > 0 ? Math.min((totalExpense / 7000) * 100, 100) : 0;

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
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.header
          className="flex items-center justify-between px-4 py-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </motion.div>
          <h1 className="text-xl font-bold text-foreground">Total Expense</h1>
          <div className="w-10" />
        </motion.header>

        <motion.main
          className="px-4 space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Month Selector */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <motion.button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2.5 hover:bg-muted rounded-full transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <motion.h3
              className="text-lg font-bold text-foreground"
              key={format(currentDate, 'MMMM yyyy')}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {format(currentDate, 'MMMM yyyy')}
            </motion.h3>
            <motion.button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2.5 hover:bg-muted rounded-full transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>

          {/* Week Calendar */}
          <motion.div variants={itemVariants}>
            <WeekCalendar
              currentDate={currentDate}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              hasTransactions={hasTransactions}
            />
          </motion.div>

          {/* Spending Summary */}
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-2xl p-5 shadow-card"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm">You have Spend</p>
                <motion.p
                  className="text-accent font-bold text-3xl mt-1"
                  key={totalExpense}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  ${totalExpense.toLocaleString()}
                </motion.p>
                <p className="text-muted-foreground text-sm mt-1">this month.</p>
              </div>
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {format(currentDate, 'MMMM, yyyy')}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.span
                className="text-primary font-bold text-sm min-w-[60px]"
                key={salaryPercentage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {salaryPercentage.toFixed(2)}%
              </motion.span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${salaryPercentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className="text-muted-foreground text-sm min-w-[60px] text-right">
                {(100 - salaryPercentage).toFixed(2)}%
              </span>
            </div>
          </motion.div>

          {/* Analytics Chart */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Analytics</h2>
              <motion.button
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-accent transition-colors"
                whileHover={{ x: 4 }}
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>

            <AnimatePresence mode="wait">
              {categoryData.length > 0 ? (
                <ExpenseDonutChart data={categoryData} />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-card rounded-2xl p-12 text-center shadow-card"
                >
                  <span className="text-5xl">📊</span>
                  <p className="text-muted-foreground mt-4">No expense data for this month</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Add some transactions to see analytics</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </motion.main>
      </div>

      <BottomNavigation onAddClick={() => setShowAddTransaction(true)} />

      <AddTransactionModal
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        onSuccess={fetchTransactions}
      />
    </div>
  );
}
