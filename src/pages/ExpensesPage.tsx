import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { WeekCalendar } from '@/components/WeekCalendar';
import { ExpenseOverview } from '@/components/ExpenseOverview';
import { ExpenseDonutChart } from '@/components/ExpenseDonutChart';
import { TransactionItem } from '@/components/TransactionItem';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Budget, CategorySpending } from '@/types';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export function ExpensesPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income' | undefined>(undefined);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchBudgets();
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
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (data) setTransactions(data as unknown as Transaction[]);
  };

  const fetchBudgets = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('budgets')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .eq('month', currentDate.getMonth() + 1)
      .eq('year', currentDate.getFullYear());

    if (data) setBudgets(data as unknown as Budget[]);
  };

  const hasTransactions = (date: Date) => {
    return transactions.some(tx => isSameDay(new Date(tx.date), date));
  };

  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalExpense = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Prepare data for donut chart
  const categoryData: CategorySpending[] = Object.values(
    transactions
      .filter(tx => tx.type === 'expense')
      .reduce((acc, tx) => {
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

  // Get expense transactions only
  const expenseTransactions = transactions.filter(tx => tx.type === 'expense');

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
        <Header title="Expenses" />

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

          {/* Summary Cards */}
          <motion.div variants={itemVariants}>
            <ExpenseOverview
              totalSalary={totalIncome || 7000}
              totalExpense={totalExpense || 0}
              cardLast4="1965"
            />
          </motion.div>

          {/* Expense Analytics with Pie Chart */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Expense Analytics</h2>
              <motion.button
                onClick={() => setShowAllExpenses(!showAllExpenses)}
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
                whileHover={{ x: 4 }}
              >
                {showAllExpenses ? 'Show Chart' : 'View All'}
              </motion.button>
            </div>

            <AnimatePresence mode="wait">
              {showAllExpenses ? (
                <motion.div
                  key="expense-list"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  {expenseTransactions.length > 0 ? (
                    expenseTransactions.map((tx, index) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <TransactionItem transaction={tx} />
                      </motion.div>
                    ))
                  ) : (
                    <div className="bg-card rounded-2xl p-8 text-center shadow-card">
                      <span className="text-5xl">💸</span>
                      <p className="text-muted-foreground mt-3">No expenses this month</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="pie-chart"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {categoryData.length > 0 ? (
                    <ExpenseDonutChart data={categoryData} />
                  ) : (
                    <div className="bg-card rounded-2xl p-8 text-center shadow-card">
                      <span className="text-5xl">📊</span>
                      <p className="text-muted-foreground mt-3">No expense data yet</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">Add transactions to see analytics</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </motion.main>
      </div>

      <BottomNavigation onAddClick={(type) => {
        setTransactionType(type);
        setShowAddTransaction(true);
      }} />

      <AddTransactionModal
        open={showAddTransaction}
        onOpenChange={(open) => {
          setShowAddTransaction(open);
          if (!open) setTransactionType(undefined);
        }}
        onSuccess={fetchTransactions}
        initialType={transactionType}
      />
    </div>
  );
}
