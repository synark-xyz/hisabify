import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CardStack } from '@/components/CardStack';
import { TransactionItem } from '@/components/TransactionItem';
import { EnhancedAnalyticsChart } from '@/components/EnhancedAnalyticsChart';
import { ExpenseOverview } from '@/components/ExpenseOverview';
import { PaymentReminderCarousel } from '@/components/PaymentReminderCarousel';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddCardModal } from '@/components/AddCardModal';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { DeleteTransactionDialog } from '@/components/DeleteTransactionDialog';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { supabase } from '@/integrations/supabase/client';
import { Card, Transaction, MonthlySpending } from '@/types';
import { format, subMonths, startOfMonth, endOfMonth, addDays, subYears } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Sample analytics data for demonstration
const sampleAnalyticsData: Record<number, MonthlySpending[]> = {
  2023: [
    { month: 'Jan', amount: 2850 },
    { month: 'Feb', amount: 3200 },
    { month: 'Mar', amount: 2950 },
    { month: 'Apr', amount: 3400 },
    { month: 'May', amount: 3100 },
    { month: 'Jun', amount: 2800 },
    { month: 'Jul', amount: 3600 },
    { month: 'Aug', amount: 3300 },
    { month: 'Sep', amount: 2900 },
    { month: 'Oct', amount: 3500 },
    { month: 'Nov', amount: 4200 },
    { month: 'Dec', amount: 4800 },
  ],
  2024: [
    { month: 'Jan', amount: 3100 },
    { month: 'Feb', amount: 2950 },
    { month: 'Mar', amount: 3400 },
    { month: 'Apr', amount: 3200 },
    { month: 'May', amount: 3600 },
    { month: 'Jun', amount: 3100 },
    { month: 'Jul', amount: 3800 },
    { month: 'Aug', amount: 3500 },
    { month: 'Sep', amount: 3200 },
    { month: 'Oct', amount: 3700 },
    { month: 'Nov', amount: 4100 },
    { month: 'Dec', amount: 4500 },
  ],
  2025: [
    { month: 'Jan', amount: 3300 },
    { month: 'Feb', amount: 3100 },
    { month: 'Mar', amount: 3500 },
    { month: 'Apr', amount: 3400 },
    { month: 'May', amount: 3700 },
    { month: 'Jun', amount: 3200 },
    { month: 'Jul', amount: 3900 },
    { month: 'Aug', amount: 3600 },
    { month: 'Sep', amount: 3300 },
    { month: 'Oct', amount: 3800 },
    { month: 'Nov', amount: 4300 },
    { month: 'Dec', amount: 4700 },
  ],
  2026: [
    { month: 'Jan', amount: 3500 },
    { month: 'Feb', amount: 3300 },
    { month: 'Mar', amount: 3700 },
    { month: 'Apr', amount: 3600 },
    { month: 'May', amount: 3900 },
    { month: 'Jun', amount: 3400 },
    { month: 'Jul', amount: 4100 },
    { month: 'Aug', amount: 3800 },
    { month: 'Sep', amount: 3500 },
    { month: 'Oct', amount: 4000 },
    { month: 'Nov', amount: 4500 },
    { month: 'Dec', amount: 4900 },
  ],
};

export function Dashboard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlySpending[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [revealedTransactionId, setRevealedTransactionId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MMM'));
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const { user } = useAuth();
  const { formatAmount, currencyVersion, currency } = useCurrency();
  const { convertAmount } = useExchangeRate();
  const navigate = useNavigate();

  const availableYears = [2023, 2024, 2025, 2026];

  useEffect(() => {
    if (user) {
      fetchCards();
      fetchTransactions();
      fetchMonthlySummary();
    }
  }, [user, currencyVersion]);

  useEffect(() => {
    generateMonthlyData();
  }, [transactions, selectedYear]);

  const fetchCards = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setCards(data as unknown as Card[]);
  };

  const fetchTransactions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(5);

    if (data) setTransactions(data as unknown as Transaction[]);
  };

  const fetchMonthlySummary = async () => {
    if (!user) return;
    const now = new Date();
    const start = startOfMonth(now).toISOString();
    const end = endOfMonth(now).toISOString();

    const { data } = await supabase
      .from('transactions')
      .select('amount, type, currency_base')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end);

    if (data) {
      // Convert amounts from stored currency to current currency
      const convertedData = await Promise.all(
        data.map(async (t) => {
          const storedCurrency = t.currency_base || 'USD';
          if (storedCurrency === currency) {
            return { ...t, convertedAmount: Number(t.amount) };
          }
          // Convert to current currency
          const result = await convertAmount(Number(t.amount), storedCurrency, currency);
          return { 
            ...t, 
            convertedAmount: result ? result.convertedAmount : Number(t.amount) 
          };
        })
      );
      
      const income = convertedData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.convertedAmount, 0);
      const expenses = convertedData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.convertedAmount, 0);
      setTotalIncome(income);
      setTotalExpenses(expenses);
    }
  };

  const generateMonthlyData = () => {
    // Use sample data for the selected year
    const yearData = sampleAnalyticsData[selectedYear];
    if (yearData) {
      // Get current month index for years in the past, or show relevant months
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonthIndex = currentDate.getMonth();
      
      // Show last 7 months of data
      let dataToShow: MonthlySpending[];
      if (selectedYear === currentYear) {
        // For current year, show months up to current month
        const startIndex = Math.max(0, currentMonthIndex - 6);
        dataToShow = yearData.slice(startIndex, currentMonthIndex + 1);
      } else if (selectedYear < currentYear) {
        // For past years, show last 7 months of the year
        dataToShow = yearData.slice(5, 12);
      } else {
        // For future years, show first 7 months
        dataToShow = yearData.slice(0, 7);
      }
      
      // Merge with actual transaction data if available
      const mergedData = dataToShow.map(sample => {
        const monthTransactions = transactions.filter(t => {
          const txDate = new Date(t.date);
          return format(txDate, 'MMM') === sample.month && 
                 txDate.getFullYear() === selectedYear &&
                 t.type === 'expense';
        });
        const actualAmount = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        return {
          month: sample.month,
          amount: actualAmount > 0 ? actualAmount : sample.amount,
        };
      });
      
      setMonthlyData(mergedData);
    }
  };

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
  };

  const totalBalance = cards.reduce((sum, card) => sum + Number(card.balance), 0);

  // Generate payment reminders from transactions
  const paymentReminders = useMemo(() => {
    const now = new Date();
    const reminders = [
      { id: '1', title: 'Electricity Bill', amount: 125, dueDate: format(addDays(now, 3), 'MMM dd'), status: 'upcoming' as const },
      { id: '2', title: 'Internet Bill', amount: 79, dueDate: format(addDays(now, -2), 'MMM dd'), status: 'paid' as const },
      { id: '3', title: 'Phone Bill', amount: 55, dueDate: format(addDays(now, -5), 'MMM dd'), status: 'missed' as const },
      { id: '4', title: 'Netflix', amount: 15, dueDate: format(addDays(now, 7), 'MMM dd'), status: 'upcoming' as const },
      { id: '5', title: 'Gym Membership', amount: 45, dueDate: format(addDays(now, 1), 'MMM dd'), status: 'upcoming' as const },
      { id: '6', title: 'Water Bill', amount: 38, dueDate: format(addDays(now, -1), 'MMM dd'), status: 'paid' as const },
    ];
    return reminders;
  }, []);

  const handleAddClick = () => {
    if (cards.length === 0) {
      setShowAddCard(true);
    } else {
      setShowAddTransaction(true);
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
        <Header title="Home" />

        <motion.main
          className="px-4 space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Balance Card Stack */}
          <motion.section variants={itemVariants}>
            {cards.length > 0 ? (
              <CardStack
                cards={cards}
                totalBalance={totalBalance}
                onCardClick={() => navigate('/cards')}
              />
            ) : (
              <motion.button
                onClick={() => setShowAddCard(true)}
                className="w-full aspect-[1.7] rounded-2xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-3 hover:border-accent hover:bg-accent/5 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-5xl">💳</span>
                <p className="text-muted-foreground font-medium">Add your first card</p>
              </motion.button>
            )}
          </motion.section>

          {/* Payment Reminders Carousel */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground">Payment Reminders</h2>
            </div>
            <PaymentReminderCarousel reminders={paymentReminders} />
          </motion.section>

          {/* Analytics Section */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Analytics</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-full text-sm font-semibold shadow-fab"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Year - {selectedYear}
                    <ChevronDown className="w-4 h-4" />
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableYears.map((year) => (
                    <DropdownMenuItem
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={selectedYear === year ? 'bg-accent/10' : ''}
                    >
                      {year}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <EnhancedAnalyticsChart 
              data={monthlyData} 
              selectedMonth={selectedMonth}
              onMonthSelect={handleMonthSelect}
            />
          </motion.section>

          {/* Quick Stats */}
          <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
            <motion.div
              className="p-4 bg-card rounded-2xl shadow-card"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-sm text-muted-foreground">Income</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatAmount(totalIncome)}
              </p>
            </motion.div>
            
            <motion.div
              className="p-4 bg-card rounded-2xl shadow-card"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-accent" />
                </div>
                <span className="text-sm text-muted-foreground">Expenses</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatAmount(totalExpenses)}
              </p>
            </motion.div>
          </motion.section>

          {/* Transactions Section */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Transactions</h2>
              <motion.button
                onClick={() => navigate('/expenses')}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-accent transition-colors"
                whileHover={{ x: 4 }}
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {transactions.length > 0 ? (
                  transactions.map((tx, index) => (
                    <TransactionItem 
                      key={tx.id} 
                      transaction={tx} 
                      index={index}
                      onEdit={setEditingTransaction}
                      onDelete={setDeletingTransaction}
                      revealedId={revealedTransactionId}
                      onReveal={setRevealedTransactionId}
                    />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12 bg-card rounded-2xl"
                  >
                    <span className="text-5xl">📊</span>
                    <p className="text-muted-foreground mt-3">No transactions yet</p>
                    <p className="text-sm text-muted-foreground/70">Add your first expense or income</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </motion.main>
      </div>

      <BottomNavigation onAddClick={handleAddClick} />

      <AddCardModal
        open={showAddCard}
        onOpenChange={setShowAddCard}
        onSuccess={() => {
          setShowAddCard(false);
          fetchCards();
        }}
      />

      <AddTransactionModal
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        onSuccess={() => {
          fetchTransactions();
          fetchMonthlySummary();
        }}
      />

      <EditTransactionModal
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
        onSuccess={() => {
          fetchTransactions();
          fetchMonthlySummary();
        }}
      />

      <DeleteTransactionDialog
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
        transaction={deletingTransaction}
        onSuccess={() => {
          fetchTransactions();
          fetchMonthlySummary();
        }}
      />
    </div>
  );
}
