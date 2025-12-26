import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { WeekCalendar } from '@/components/WeekCalendar';
import { ExpenseOverview } from '@/components/ExpenseOverview';
import { BudgetCard } from '@/components/BudgetCard';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Budget, Category } from '@/types';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export function ExpensesPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // Group transactions by category for display
  const categoryGroups = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => {
      const catId = tx.category_id || 'other';
      if (!acc[catId]) {
        acc[catId] = {
          category: tx.category,
          transactions: [],
          total: 0,
        };
      }
      acc[catId].transactions.push(tx);
      acc[catId].total += Number(tx.amount);
      return acc;
    }, {} as Record<string, { category?: Category; transactions: Transaction[]; total: number }>);

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
              totalExpense={totalExpense || 4543.98}
              cardLast4="1965"
            />
          </motion.div>

          {/* Expenses by Category */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Expenses</h2>
              <motion.button
                onClick={() => navigate('/analytics')}
                className="text-sm text-muted-foreground hover:text-accent transition-colors"
                whileHover={{ x: 4 }}
              >
                View All
              </motion.button>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {Object.keys(categoryGroups).length > 0 ? (
                  Object.entries(categoryGroups).map(([catId, group], index) => (
                    <motion.div
                      key={catId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <BudgetCard
                        budget={{
                          id: catId,
                          user_id: user?.id || '',
                          category_id: catId,
                          amount: budgets.find(b => b.category_id === catId)?.amount || 3000,
                          month: currentDate.getMonth() + 1,
                          year: currentDate.getFullYear(),
                          created_at: '',
                          category: group.category,
                        }}
                        spent={group.total}
                      />
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-2xl p-8 text-center shadow-card"
                  >
                    <span className="text-5xl">💸</span>
                    <p className="text-muted-foreground mt-3">No expenses this month</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Start tracking your spending</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
