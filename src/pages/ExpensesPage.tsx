import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonthCalendar } from '@/components/MonthCalendar';
import { SwipeableWeekCalendar } from '@/components/SwipeableWeekCalendar';
import { ExpenseOverview } from '@/components/ExpenseOverview';
import { ExpenseDonutChart } from '@/components/ExpenseDonutChart';
import { TransactionItem } from '@/components/TransactionItem';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { DeleteTransactionDialog } from '@/components/DeleteTransactionDialog';
import { PullToRefresh } from '@/components/PullToRefresh';
import { getTransactionCategoryName, getTransactionCategoryColor } from '@/lib/transactionUtils';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Budget, CategorySpending } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  format, startOfMonth, endOfMonth, isSameDay, isSameMonth, addMonths, subMonths,
  startOfWeek, endOfWeek, addWeeks, subWeeks, setYear, setMonth
} from 'date-fns';

interface ConvertedTransaction extends Transaction {
  convertedAmount: number;
}

export function ExpensesPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [transactions, setTransactions] = useState<ConvertedTransaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [revealedTransactionId, setRevealedTransactionId] = useState<string | null>(null);
  const { user } = useAuth();
  const { currency, currencyVersion } = useCurrency();
  const { convertAmount } = useExchangeRate();

  // Move definitions up
  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    // Determine fetch range based on view mode (add buffer)
    let start, end;
    if (viewMode === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 }).toISOString();
      end = endOfWeek(currentDate, { weekStartsOn: 1 }).toISOString();
    } else {
      start = startOfMonth(currentDate).toISOString();
      end = endOfMonth(currentDate).toISOString();
    }

    // Safe buffer to handle edge cases
    const bufferStart = viewMode === 'week' ? subWeeks(new Date(start), 1).toISOString() : start;
    const bufferEnd = viewMode === 'week' ? addWeeks(new Date(end), 1).toISOString() : end;

    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .gte('date', bufferStart)
      .lte('date', bufferEnd)
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
  }, [user, currentDate, viewMode, currency, convertAmount]);

  const fetchBudgets = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('budgets')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .eq('month', currentDate.getMonth() + 1)
      .eq('year', currentDate.getFullYear());

    if (data) setBudgets(data as unknown as Budget[]);
  }, [user, currentDate]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchTransactions(), fetchBudgets()]);
  }, [fetchTransactions, fetchBudgets]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchTransactions();
      fetchBudgets();
    };
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, [fetchTransactions, fetchBudgets]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchBudgets();
    }
  }, [user, currentDate, viewMode, currency, currencyVersion]);



  const hasTransactions = (date: Date) => {
    return transactions.some(tx => isSameDay(new Date(tx.date), date));
  };

  // Determine the date range for the current view
  const viewStart = viewMode === 'week'
    ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : startOfMonth(currentDate);

  const viewEnd = viewMode === 'week'
    ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : endOfMonth(currentDate);

  // Filter transactions for the current VIEW range (for stats)
  const rangeTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= viewStart && txDate <= viewEnd;
  });

  // Filter transactions for the LIST (specific date if selected, otherwise whole range)
  const listTransactions = selectedDate
    ? transactions.filter(tx => isSameDay(new Date(tx.date), selectedDate))
    : rangeTransactions;

  // Use listTransactions for calculations so chart respects selected date
  const chartTransactions = listTransactions;

  const totalIncome = chartTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.convertedAmount, 0);

  const totalExpense = chartTransactions
    .filter(tx => tx.type === 'expense' || tx.type === 'lend' || tx.type === 'owe')
    .reduce((sum, tx) => sum + tx.convertedAmount, 0);

  // Category data for charts (based on selected date or range)
  const categoryData: CategorySpending[] = Object.values(
    chartTransactions
      .filter(tx => tx.type === 'expense' || tx.type === 'lend' || tx.type === 'owe')
      .reduce((acc, tx) => {
        const catName = getTransactionCategoryName(tx);
        const catColor = getTransactionCategoryColor(tx);

        if (!acc[catName]) {
          acc[catName] = { name: catName, amount: 0, color: catColor, percentage: 0 };
        }
        acc[catName].amount += tx.convertedAmount;
        return acc;
      }, {} as Record<string, CategorySpending>)
  ).map(cat => ({
    ...cat,
    percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0,
  })).sort((a, b) => b.amount - a.amount);

  // Create timeframe key for chart updates - include selected date so chart re-renders
  const timeframeKey = selectedDate
    ? `day-${selectedDate.toISOString().split('T')[0]}`
    : `${viewMode}-${currentDate.toISOString().split('T')[0]}`;

  const expenseTransactions = listTransactions.filter(tx => tx.type === 'expense' || tx.type === 'lend' || tx.type === 'owe');

  const handleDateSelect = (date: Date) => {
    if (selectedDate && isSameDay(date, selectedDate)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
      // Sync the view (month/year) if the selected date is in a different month
      if (!isSameMonth(date, currentDate)) {
        setCurrentDate(date);
      }
    }
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => addWeeks(prev, 1));
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(prev => subMonths(prev, 1));
    } else {
      setCurrentDate(prev => addMonths(prev, 1));
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
    <div className="min-h-screen bg-background">
      <PullToRefresh onRefresh={handleRefresh} className="h-full pb-page-content fade-bottom-overlay">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">


          <motion.main
            className="px-4 space-y-6 pb-24"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Calendar Controls */}
            <motion.div variants={itemVariants} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <motion.button
                  onClick={() => handleMonthChange('prev')}
                  className="p-2.5 hover:bg-muted rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>

                <div className="flex flex-col items-center gap-3">
                  {/* Date Selectors */}
                  <div className="flex flex-col items-center -space-y-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <motion.button
                          className="flex items-center gap-1 px-3 py-1 rounded-full hover:bg-accent/10 transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="text-sm font-semibold text-muted-foreground">
                            {format(currentDate, 'yyyy')}
                          </span>
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        </motion.button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        {[2023, 2024, 2025, 2026].map((year) => (
                          <DropdownMenuItem
                            key={year}
                            onClick={() => setCurrentDate(setYear(currentDate, year))}
                            className={currentDate.getFullYear() === year ? 'bg-accent/10' : ''}
                          >
                            {year}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <motion.button
                          className="flex items-center gap-1 px-3 py-1 rounded-full hover:bg-accent/10 transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="text-xl font-bold text-foreground">
                            {format(currentDate, 'MMMM')}
                          </span>
                          <ChevronDown className="w-4 h-4 text-foreground" />
                        </motion.button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="max-h-[300px] overflow-y-auto">
                        {Array.from({ length: 12 }, (_, i) => i).map((monthIndex) => {
                          const date = setMonth(new Date(), monthIndex);
                          return (
                            <DropdownMenuItem
                              key={monthIndex}
                              onClick={() => setCurrentDate(setMonth(currentDate, monthIndex))}
                              className={currentDate.getMonth() === monthIndex ? 'bg-accent/10' : ''}
                            >
                              {format(date, 'MMMM')}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* View Toggle */}
                  <div className="flex p-1 bg-muted rounded-full">
                    <button
                      onClick={() => setViewMode('week')}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                        viewMode === 'week'
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setViewMode('month')}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                        viewMode === 'month'
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Monthly
                    </button>
                  </div>
                </div>

                <motion.button
                  onClick={() => handleMonthChange('next')}
                  className="p-2.5 hover:bg-muted rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>

              <AnimatePresence mode="wait">
                {viewMode === 'week' ? (
                  <motion.div
                    key="week-calendar"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <SwipeableWeekCalendar
                      currentDate={currentDate}
                      selectedDate={selectedDate}
                      onDateSelect={handleDateSelect}
                      onWeekChange={handleWeekChange}
                      hasTransactions={hasTransactions}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="month-calendar"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <MonthCalendar
                      currentDate={currentDate}
                      selectedDate={selectedDate}
                      onDateSelect={handleDateSelect}
                      onMonthChange={setCurrentDate}
                      hasTransactions={hasTransactions}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Summary Cards */}
            <motion.div variants={itemVariants}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {selectedDate
                    ? 'Daily Overview'
                    : viewMode === 'week' ? 'Weekly Overview' : 'Monthly Overview'}
                </span>
                {selectedDate && (
                  <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">
                    {format(selectedDate, 'MMM d')}
                  </span>
                )}
              </div>
              <ExpenseOverview
                totalSalary={totalIncome}
                totalExpense={totalExpense}
              />
            </motion.div>

            {/* Expense Analytics with Pie Chart */}
            <motion.section variants={itemVariants}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">
                  {selectedDate
                    ? 'Daily Analytics'
                    : viewMode === 'week' ? 'Weekly Analytics' : 'Monthly Analytics'}
                </h2>
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
                        <p className="text-muted-foreground mt-3">No expenses found</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          {selectedDate ? 'Try selecting a different date' : 'No expenses in this period'}
                        </p>
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
                      <ExpenseDonutChart data={categoryData} timeframeKey={timeframeKey} />
                    ) : (
                      <div className="bg-card rounded-2xl p-8 text-center shadow-card">
                        <span className="text-5xl">📊</span>
                        <p className="text-muted-foreground mt-3">No data to visualize</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Add transactions to see analytics</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          </motion.main>
        </div>
      </PullToRefresh>



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
    </div >
  );
}
