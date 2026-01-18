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
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { DeleteTransactionDialog } from '@/components/DeleteTransactionDialog';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Budget, CategorySpending } from '@/types';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from 'date-fns';

interface ConvertedTransaction extends Transaction {
  convertedAmount: number;
}

export function ExpensesPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<ConvertedTransaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [revealedTransactionId, setRevealedTransactionId] = useState<string | null>(null);
  const { user } = useAuth();
  const { currency, currencyVersion } = useCurrency();
  const { convertAmount } = useExchangeRate();

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchBudgets();
    }
  }, [user, currentDate, currency, currencyVersion]);

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

    if (data) {
      // Convert amounts to current currency
      const convertedData = await Promise.all(
        (data as unknown as Transaction[]).map(async (tx) => {
          const storedCurrency = tx.currency_base || 'USD';
          if (storedCurrency === currency) {
            return { ...tx, convertedAmount: Number(tx.amount) };
          }
          const result = await convertAmount(Number(tx.amount), storedCurrency, currency);
          return { 
            ...tx, 
            convertedAmount: result ? result.convertedAmount : Number(tx.amount) 
          };
        })
      );
      setTransactions(convertedData);
    }
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

  // Filter transactions based on selected date (if selected, filter by that date; otherwise show all month)
  const filteredTransactions = selectedDate
    ? transactions.filter(tx => isSameDay(new Date(tx.date), selectedDate))
    : transactions;

  const totalIncome = filteredTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.convertedAmount, 0);

  const totalExpense = filteredTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.convertedAmount, 0);

  // Prepare data for donut chart - based on filtered transactions with converted amounts
  const categoryData: CategorySpending[] = Object.values(
    filteredTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((acc, tx) => {
        const catName = tx.category?.name || 'Other';
        const catColor = tx.category?.color || '#6B7280';
        
        if (!acc[catName]) {
          acc[catName] = { category: catName, amount: 0, color: catColor, percentage: 0 };
        }
        acc[catName].amount += tx.convertedAmount;
        return acc;
      }, {} as Record<string, CategorySpending>)
  ).map(cat => ({
    ...cat,
    percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0,
  }));

  // Get expense transactions only - based on filtered transactions
  const expenseTransactions = filteredTransactions.filter(tx => tx.type === 'expense');

  // Handle date selection - toggle selection
  const handleDateSelect = (date: Date) => {
    if (selectedDate && isSameDay(date, selectedDate)) {
      setSelectedDate(null); // Deselect if clicking same date
    } else {
      setSelectedDate(date);
    }
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
              onDateSelect={handleDateSelect}
              hasTransactions={hasTransactions}
            />
            {selectedDate && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Showing expenses for {format(selectedDate, 'MMM dd, yyyy')} • Tap again to see full month
              </p>
            )}
          </motion.div>

          {/* Summary Cards */}
          <motion.div variants={itemVariants}>
            <ExpenseOverview
              totalSalary={totalIncome}
              totalExpense={totalExpense}
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
                      <TransactionItem 
                        transaction={tx} 
                        onEdit={setEditingTransaction}
                        onDelete={setDeletingTransaction}
                        revealedId={revealedTransactionId}
                        onReveal={setRevealedTransactionId}
                      />
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

      <BottomNavigation onAddClick={() => setShowAddTransaction(true)} />

      <AddTransactionModal
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        onSuccess={fetchTransactions}
      />

      <EditTransactionModal
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
        onSuccess={fetchTransactions}
      />

      <DeleteTransactionDialog
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
        transaction={deletingTransaction}
        onSuccess={fetchTransactions}
      />
    </div>
  );
}
