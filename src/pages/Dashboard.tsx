import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown, TrendUp, TrendDown, ArrowRight, Wallet, Sparkle, Bell, CreditCard, Faders, Plus, ChartPie, ClockCounterClockwise, Crown } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CardStack } from '@/components/CardStack';
import { TransactionItem } from '@/components/TransactionItem';
import { EnhancedAnalyticsChart } from '@/components/EnhancedAnalyticsChart';
import { PaymentReminderCarousel } from '@/components/PaymentReminderCarousel';
import { ParticlesBackground } from '@/components/ParticlesBackground';
import { BottomNavigation } from '@/components/BottomNavigation';
import { PullToRefresh } from '@/components/PullToRefresh';
import { AddCardModal } from '@/components/AddCardModal';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { ManageRemindersModal } from '@/components/ManageRemindersModal';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { DeleteTransactionDialog } from '@/components/DeleteTransactionDialog';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { usePaymentReminders } from '@/hooks/usePaymentReminders';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/UpgradeModal';
import { supabase } from '@/integrations/supabase/client';
import { Card, Transaction, MonthlySpending } from '@/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Sample analytics data for demonstration
const sampleAnalyticsData: Record<number, MonthlySpending[]> = {
  2023: [
    { month: 'Jan', amount: 2850, year: 2023 },
    { month: 'Feb', amount: 3200, year: 2023 },
    { month: 'Mar', amount: 2950, year: 2023 },
    { month: 'Apr', amount: 3400, year: 2023 },
    { month: 'May', amount: 3100, year: 2023 },
    { month: 'Jun', amount: 2800, year: 2023 },
    { month: 'Jul', amount: 3600, year: 2023 },
    { month: 'Aug', amount: 3300, year: 2023 },
    { month: 'Sep', amount: 2900, year: 2023 },
    { month: 'Oct', amount: 3500, year: 2023 },
    { month: 'Nov', amount: 4200, year: 2023 },
    { month: 'Dec', amount: 4800, year: 2023 },
  ],
  2024: [
    { month: 'Jan', amount: 3100, year: 2024 },
    { month: 'Feb', amount: 2950, year: 2024 },
    { month: 'Mar', amount: 3400, year: 2024 },
    { month: 'Apr', amount: 3200, year: 2024 },
    { month: 'May', amount: 3600, year: 2024 },
    { month: 'Jun', amount: 3100, year: 2024 },
    { month: 'Jul', amount: 3800, year: 2024 },
    { month: 'Aug', amount: 3500, year: 2024 },
    { month: 'Sep', amount: 3200, year: 2024 },
    { month: 'Oct', amount: 3700, year: 2024 },
    { month: 'Nov', amount: 4100, year: 2024 },
    { month: 'Dec', amount: 4500, year: 2024 },
  ],
  2025: [
    { month: 'Jan', amount: 3300, year: 2025 },
    { month: 'Feb', amount: 3100, year: 2025 },
    { month: 'Mar', amount: 3500, year: 2025 },
    { month: 'Apr', amount: 3400, year: 2025 },
    { month: 'May', amount: 3700, year: 2025 },
    { month: 'Jun', amount: 3200, year: 2025 },
    { month: 'Jul', amount: 3900, year: 2025 },
    { month: 'Aug', amount: 3600, year: 2025 },
    { month: 'Sep', amount: 3300, year: 2025 },
    { month: 'Oct', amount: 3800, year: 2025 },
    { month: 'Nov', amount: 4300, year: 2025 },
    { month: 'Dec', amount: 4700, year: 2025 },
  ],
  2026: [
    { month: 'Jan', amount: 3500, year: 2026 },
    { month: 'Feb', amount: 3300, year: 2026 },
    { month: 'Mar', amount: 3700, year: 2026 },
    { month: 'Apr', amount: 3600, year: 2026 },
    { month: 'May', amount: 3900, year: 2026 },
    { month: 'Jun', amount: 3400, year: 2026 },
    { month: 'Jul', amount: 4100, year: 2026 },
    { month: 'Aug', amount: 3800, year: 2026 },
    { month: 'Sep', amount: 3500, year: 2026 },
    { month: 'Oct', amount: 4000, year: 2026 },
    { month: 'Nov', amount: 4500, year: 2026 },
    { month: 'Dec', amount: 4900, year: 2026 },
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
  const [transactionType, setTransactionType] = useState<'expense' | 'income' | 'lend' | 'owe' | undefined>(undefined);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MMM'));
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [showAddPaymentReminder, setShowAddPaymentReminder] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { reminders: paymentReminders, refetch: refetchReminders } = usePaymentReminders();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
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

  const handleRefresh = async () => {
    await Promise.all([
      fetchCards(),
      fetchTransactions(),
      fetchMonthlySummary(),
      refetchReminders() // and reminders!
    ]);
  };

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
          year: selectedYear,
        };
      });

      setMonthlyData(mergedData);
    }
  };

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
  };

  const totalBalance = cards.reduce((sum, card) => sum + Number(card.balance), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const netBalance = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-transparent">
      <ParticlesBackground />
      <PullToRefresh onRefresh={handleRefresh} className="h-[100dvh] pb-page-content fade-bottom-overlay">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto safe-top pt-4">
          <Header title="Dashboard" />

          <motion.main
            className="px-4 space-y-6 pb-24 mt-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Hero Section - Wallet Overview */}
            <motion.section variants={itemVariants}>
              <div className="bg-card rounded-3xl p-6 shadow-card border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-accent/20 transition-colors" />
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="w-4 h-4 text-muted-foreground" weight="duotone" />
                      <span className="text-sm font-medium text-muted-foreground">Main Balance</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground">
                      {formatAmount(netBalance)}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full text-emerald-500 text-xs font-bold ring-1 ring-emerald-500/20">
                      <TrendUp className="w-3 h-3" weight="duotone" />
                      Today +$12.50
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendDown className="w-4 h-4 text-rose-500" weight="duotone" />
                      <span className="text-xs font-medium text-muted-foreground tracking-wider">Expenses</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{formatAmount(totalExpenses)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendUp className="w-4 h-4 text-emerald-500" weight="duotone" />
                      <span className="text-xs font-medium text-muted-foreground tracking-wider">Income</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{formatAmount(totalIncome)}</p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Upgrade to Pro Banner - Only for non-premium users */}
            {!subscriptionLoading && !isPremium && (
              <motion.section variants={itemVariants}>
                <div
                  onClick={() => setShowUpgradeModal(true)}
                  className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl shadow-purple-500/20 cursor-pointer group hover:scale-[1.02] transition-transform"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" weight="duotone" />
                        <span className="text-xs font-black text-white/90 tracking-[0.2em]">Premium Feature</span>
                      </div>
                      <h3 className="text-xl font-black text-white">Upgrade to Pro</h3>
                      <p className="text-sm text-white/70 font-medium">Unlock Unlimited Budgets & Advanced Insights</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Sparkle className="w-6 h-6 text-white animate-pulse" weight="duotone" />
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Payment Reminders Section */}
            <motion.section variants={itemVariants}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 font-black tracking-tight">
                  <Bell className="w-5 h-5 text-accent" weight="duotone" />
                  Reminders
                </h2>
                <motion.button
                  onClick={() => setShowAddPaymentReminder(true)}
                  className="p-2 bg-muted/50 rounded-xl hover:bg-muted text-muted-foreground transition-colors border border-border/50"
                  whileHover={{ rotate: 90 }}
                >
                  <Faders className="w-4 h-4" weight="duotone" />
                </motion.button>
              </div>
              <PaymentReminderCarousel reminders={paymentReminders} />
            </motion.section>




            {/* Analytics Section */}
            <motion.section variants={itemVariants}>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 font-black tracking-tight">
                  <ChartPie className="w-5 h-5 text-accent" weight="duotone" />
                  Insights
                </h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-accent text-white rounded-full text-xs font-black shadow-fab tracking-wider"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Year {selectedYear}
                      <CaretDown className="w-4 h-4" weight="duotone" />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl border-border/50">
                    {availableYears.map((year) => (
                      <DropdownMenuItem
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={cn(selectedYear === year ? 'bg-accent text-white' : '', "rounded-xl m-1")}
                      >
                        {year}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="bg-card rounded-3xl p-5 shadow-card border border-white/5 relative overflow-hidden">
                {/* Premium Guard Overlay */}
                {!isPremium && !subscriptionLoading && (
                  <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-4 border border-border/50">
                      <Crown className="w-8 h-8 text-accent fill-accent" weight="duotone" />
                    </div>
                    <h3 className="text-xl font-black mb-2 text-foreground">Unlock Full Insights</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
                      See exactly where your money goes with advanced analytics and trends.
                    </p>
                    <motion.button
                      onClick={() => setShowUpgradeModal(true)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black shadow-lg shadow-purple-500/25 flex items-center gap-2"
                    >
                      Upgrade to Pro
                    </motion.button>
                  </div>
                )}

                <EnhancedAnalyticsChart
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  onMonthSelect={handleMonthSelect}
                />
              </div>
            </motion.section>

            {/* Transactions Section */}
            <motion.section variants={itemVariants}>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 font-black tracking-tight">
                  <ClockCounterClockwise className="w-5 h-5 text-primary" weight="duotone" />
                  Recent History
                </h2>
                <motion.button
                  onClick={() => navigate('/expenses')}
                  className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-accent transition-colors"
                  whileHover={{ x: 4 }}
                >
                  View All
                  <ArrowRight className="w-4 h-4" weight="duotone" />
                </motion.button>
              </div>
              <div className="space-y-3">
                {transactions.length > 0 ? (
                  transactions.map((tx, idx) => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                      index={idx}
                      onEdit={setEditingTransaction}
                      onDelete={setDeletingTransaction}
                      revealedId={revealedTransactionId}
                      onReveal={setRevealedTransactionId}
                    />
                  ))
                ) : (
                  <div className="bg-card/50 rounded-2xl p-8 text-center border border-dashed border-muted-foreground/20">
                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Sparkle className="w-8 h-8 text-muted-foreground/30" weight="duotone" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No transactions yet. Start adding your expenses!</p>
                  </div>
                )}
              </div>
            </motion.section>
          </motion.main>
        </div>
      </PullToRefresh>

      <BottomNavigation
        onAddTransaction={() => setShowAddTransaction(true)}
      />

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
        onOpenChange={(open) => {
          setShowAddTransaction(open);
          if (!open) setTransactionType(undefined);
        }}
        onSuccess={() => {
          fetchTransactions();
          fetchMonthlySummary();
        }}
        initialType={transactionType}
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

      <ManageRemindersModal
        open={showAddPaymentReminder}
        onOpenChange={setShowAddPaymentReminder}
        reminders={paymentReminders}
        onRefresh={refetchReminders}
      />

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        source="dashboard_banner"
      />
    </div>
  );
}
