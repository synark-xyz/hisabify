import React, { useState, useEffect, useMemo } from 'react'; // Re-verify imports to fix refresh crash
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown, TrendUp, TrendDown, ArrowRight, Wallet, Sparkle, Bell, Faders, ChartPie, ClockCounterClockwise, Crown } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { DailyQuote } from '@/components/DailyQuote';
import { StreamingGreeting } from '@/components/StreamingGreeting';
import { HealthScoreCard } from '@/features/gamification/components/HealthScoreCard';
import { TransactionItem } from '@/components/TransactionItem';
import { EnhancedAnalyticsChart } from '@/components/EnhancedAnalyticsChart';
import { PaymentReminderCarousel } from '@/components/PaymentReminderCarousel';
import { ParticlesBackground } from '@/components/ParticlesBackground';
import { PullToRefresh } from '@/components/PullToRefresh';
import { ManageRemindersModal } from '@/components/ManageRemindersModal';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { DeleteTransactionDialog } from '@/components/DeleteTransactionDialog';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { usePaymentReminders } from '@/hooks/usePaymentReminders';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/hooks/useTheme';
import { UpgradeModal } from '@/components/UpgradeModal';
import { supabase } from '@/integrations/supabase/client';
import { Card, Transaction, MonthlySpending } from '@/types';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlySpending[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [revealedTransactionId, setRevealedTransactionId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MMM'));
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [todayNet, setTodayNet] = useState(0);
  const [showAddPaymentReminder, setShowAddPaymentReminder] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { reminders: paymentReminders, refetch: refetchReminders } = usePaymentReminders();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const { user } = useAuth();
  const { variant } = useTheme();
  const { formatAmount, currencyVersion, currency } = useCurrency();
  const { convertAmount } = useExchangeRate();
  const navigate = useNavigate();

  const availableYears = [2023, 2024, 2025, 2026];

  // Event listener for layout modal updates
  useEffect(() => {
    const onTransactionUpdated = () => handleRefresh();
    window.addEventListener('transaction-updated', onTransactionUpdated);
    return () => window.removeEventListener('transaction-updated', onTransactionUpdated);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchMonthlySummary();
      fetchTodayTransactions();
    }
  }, [user, currencyVersion]);

  useEffect(() => {
    generateMonthlyData();
  }, [transactions, selectedYear]);

  const handleRefresh = async () => {
    await Promise.all([
      fetchTransactions(),
      fetchMonthlySummary(),
      fetchTodayTransactions(),
      refetchReminders()
    ]);
  };



  const fetchTransactions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(5);

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
          if (!result) {
            console.warn(`Failed to convert ${t.amount} from ${storedCurrency} to ${currency} for transaction ${t.id}`);
          }
          return {
            ...t,
            convertedAmount: result ? result.convertedAmount : Number(t.amount)
          };
        })
      );
      setTransactions(convertedData as unknown as Transaction[]);
    }
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

  const fetchTodayTransactions = async () => {
    if (!user) return;
    const now = new Date();
    const start = startOfDay(now).toISOString();
    const end = endOfDay(now).toISOString();

    const { data } = await supabase
      .from('transactions')
      .select('amount, type, currency_base')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end);

    if (data) {
      const convertedData = await Promise.all(
        data.map(async (t) => {
          const storedCurrency = t.currency_base || 'USD';
          if (storedCurrency === currency) {
            return { ...t, convertedAmount: Number(t.amount) };
          }
          const result = await convertAmount(Number(t.amount), storedCurrency, currency);
          return {
            ...t,
            convertedAmount: result ? result.convertedAmount : Number(t.amount)
          };
        })
      );

      const income = convertedData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.convertedAmount, 0);
      const expenses = convertedData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.convertedAmount, 0);
      setTodayNet(income - expenses);
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

  const netBalance = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-transparent">
      <ParticlesBackground />
      <PullToRefresh onRefresh={handleRefresh} className="h-full pb-page-content fade-bottom-overlay">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">


          <motion.main
            className="px-4 space-y-6 pb-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ willChange: 'opacity' }}
          >
            <StreamingGreeting />
            {/* Hero Section - Wallet Overview */}
            <motion.section
              key="hero-section"
              initial={{ opacity: 1, y: 0 }}
              style={{ willChange: 'auto' }}
            >
              <div
                className={cn(
                  "rounded-3xl p-6 shadow-xl relative overflow-hidden text-white transition-all",
                  variant === 'cyberpunk'
                    ? "card-3d bg-card border-none"
                    : "bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#DB2777]"
                )}
                style={{ contain: 'layout', willChange: 'transform' }}
              >
                <div
                  className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"
                  style={{ willChange: 'filter', transform: 'translateZ(0)' }}
                />
                <div
                  className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none"
                  style={{ willChange: 'filter', transform: 'translateZ(0)' }}
                />

                <div className="relative z-10 flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                      <div
                        className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm"
                        style={{ willChange: 'backdrop-filter', transform: 'translateZ(0)' }}
                      >
                        <Wallet className="w-4 h-4 text-white" weight="fill" />
                      </div>
                      <span className="text-sm font-medium tracking-wide">Main Balance</span>
                    </div>
                    <h2 className={cn("text-4xl font-black tracking-tight mb-1", variant === 'cyberpunk' && "text-glow")}>
                      {formatAmount(netBalance)}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold ring-1 ring-white/30 shadow-sm"
                      style={{ willChange: 'backdrop-filter', transform: 'translateZ(0)' }}
                    >
                      <TrendUp className="w-3.5 h-3.5 text-emerald-300" weight="bold" />
                      <span className="text-white">Today {formatAmount(todayNet)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="group p-4 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/30 transition-colors"
                    style={{ willChange: 'backdrop-filter', transform: 'translateZ(0)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-full bg-rose-500/20">
                        <TrendDown className="w-3.5 h-3.5 text-rose-300" weight="bold" />
                      </div>
                      <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Expenses</span>
                    </div>
                    <p className="text-lg font-bold text-white tracking-tight">{formatAmount(totalExpenses)}</p>
                  </div>
                  <div
                    className="group p-4 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/30 transition-colors"
                    style={{ willChange: 'backdrop-filter', transform: 'translateZ(0)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-full bg-emerald-500/20">
                        <TrendUp className="w-3.5 h-3.5 text-emerald-300" weight="bold" />
                      </div>
                      <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Income</span>
                    </div>
                    <p className="text-lg font-bold text-white tracking-tight">{formatAmount(totalIncome)}</p>
                  </div>
                </div>
              </div>
            </motion.section>

            <DailyQuote />

            <HealthScoreCard />

            {/* Upgrade to Pro Banner - Only for non-premium users */}
            {/* Upgrade to Pro Banner - Compact & Premium */}
            <AnimatePresence mode="wait">
              {!subscriptionLoading && !isPremium && (
                <motion.section
                  key="upgrade-banner"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{ willChange: 'transform, opacity' }}
                >
                  <div
                    onClick={() => setShowUpgradeModal(true)}
                    className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 shadow-lg shadow-purple-500/20 cursor-pointer group transition-all active:scale-95"
                  >
                    <div
                      className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/20 transition-colors"
                      style={{ willChange: 'filter', transform: 'translateZ(0)' }}
                    />

                    <div className="relative z-10 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner ring-1 ring-white/30"
                          style={{ willChange: 'backdrop-filter', transform: 'translateZ(0)' }}
                        >
                          <Crown className="w-5 h-5 text-white" weight="fill" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-base font-bold text-white tracking-tight">Upgrade to Pro</h3>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/20 text-white font-bold uppercase tracking-wide">
                              New
                            </span>
                          </div>
                          <p className="text-xs text-white/80 font-medium">Unlock unlimited budgets & insights</p>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-white text-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Sparkle className="w-4 h-4" weight="fill" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Payment Reminders Section */}
            <motion.section
              key="reminders-section"
              initial={{ opacity: 1, y: 0 }}
              style={{ willChange: 'auto' }}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 font-black tracking-tight">
                  <Bell className="w-5 h-5 text-accent" weight="duotone" />
                  Reminders
                </h2>
                <motion.button
                  onClick={() => setShowAddPaymentReminder(true)}
                  className="p-2 bg-muted/50 rounded-xl hover:bg-muted text-muted-foreground transition-colors border border-border/50"
                  whileHover={{ rotate: 90 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{ willChange: 'transform' }}
                >
                  <Faders className="w-4 h-4" weight="duotone" />
                </motion.button>
              </div>
              <PaymentReminderCarousel reminders={paymentReminders} />
            </motion.section>

            {/* Analytics Section */}
            <motion.section
              key="analytics-section"
              initial={{ opacity: 1, y: 0 }}
              style={{ willChange: 'auto' }}
            >
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
              <div className={cn(
                "bg-card rounded-3xl p-5 shadow-card border border-white/5 relative overflow-hidden transition-all duration-500",
                !isPremium && !subscriptionLoading && "max-h-[280px]"
              )}>
                {/* Premium Guard Overlay */}
                {!isPremium && !subscriptionLoading && (
                  <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-4 border border-50">
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

            {/* Monthly Reports Preview */}
            <motion.section
              key="transactions-section"
              initial={{ opacity: 1, y: 0 }}
              style={{ willChange: 'auto' }}
            >
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
