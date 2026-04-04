import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown, TrendUp, TrendDown, ArrowRight, Wallet, Sparkle, Bell, Faders, ChartPie, ClockCounterClockwise, Crown, CheckCircle, Plus, PiggyBank, Handshake, Trash } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { StreamingGreeting } from '@/components/StreamingGreeting';
import { Skeleton } from '@/components/ui/skeleton';
import { HealthScoreCard } from '@/features/gamification/components/HealthScoreCard';
import { TransactionItem } from '@/components/TransactionItem';
import { EnhancedAnalyticsChart } from '@/components/EnhancedAnalyticsChart';
import { PaymentReminderCarousel } from '@/components/PaymentReminderCarousel';
import { SavingsSnapshotCard } from '@/components/dashboard/SavingsSnapshotCard';
import { DebtTriageWidget } from '@/components/dashboard/DebtTriageWidget';
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
import { useTransactionUpdateListener } from '@/hooks/useTransactionUpdateListener';
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser';
import { UpgradeModal } from '@/components/UpgradeModal';
import { MonthlyWrapCard } from '@/components/MonthlyWrapCard';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, ActivityLog } from '@/types';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, getMonth, getYear } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [revealedTransactionId, setRevealedTransactionId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MMM'));
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [todayNet, setTodayNet] = useState(0);
  const [showAddPaymentReminder, setShowAddPaymentReminder] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { reminders: paymentReminders, refetch: refetchReminders } = usePaymentReminders();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const { isFirstTimeUser, refetch: refetchFirstTimeStatus } = useFirstTimeUser();
  const { user } = useAuth();
  const { variant, theme } = useTheme();
  const useDarkText = variant === 'cyberpunk' && theme === 'light';
  const { formatAmount, currencyVersion, currency } = useCurrency();
  const { convertAmount } = useExchangeRate();
  const navigate = useNavigate();

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(5);

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
      setTransactions(convertedData as unknown as Transaction[]);
    }
  }, [convertAmount, currency, user]);

  const fetchActivityLogs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) {
      setActivityLogs(data as ActivityLog[]);
    }
  }, [user]);

  const fetchAvailableYears = useCallback(async () => {
    const currentYear = new Date().getFullYear();
    if (!user) {
      setAvailableYears([currentYear]);
      return;
    }

    const { data } = await supabase
      .from('transactions')
      .select('date')
      .eq('user_id', user.id);

    const years = new Set<number>([currentYear]);
    data?.forEach(({ date }) => {
      const year = new Date(date).getFullYear();
      if (!isNaN(year)) {
        years.add(year);
      }
    });

    const sortedYears = Array.from(years).sort((a, b) => a - b);
    setAvailableYears(sortedYears);
    setSelectedYear((prev) => (sortedYears.includes(prev) ? prev : sortedYears[sortedYears.length - 1]));
  }, [user]);

  const fetchMonthlySummary = useCallback(async () => {
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
  }, [convertAmount, currency, user]);

  const fetchTodayTransactions = useCallback(async () => {
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
  }, [convertAmount, currency, user]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchTransactions(),
      fetchActivityLogs(),
      fetchMonthlySummary(),
      fetchTodayTransactions(),
      fetchAvailableYears(),
      refetchReminders(),
      refetchFirstTimeStatus()
    ]);
  }, [fetchTransactions, fetchActivityLogs, fetchMonthlySummary, fetchTodayTransactions, fetchAvailableYears, refetchReminders, refetchFirstTimeStatus]);

  useTransactionUpdateListener(() => {
    void handleRefresh();
  });

  useEffect(() => {
    if (user) {
      void handleRefresh();
    }
  }, [user, currencyVersion, handleRefresh]);

  const handleMonthSelect = useCallback((month: string) => {
    setSelectedMonth(month);
  }, []);

  const activeReminders = useMemo(() => {
    return paymentReminders.filter((reminder) => {
      const status = reminder.status as string;
      return status === 'upcoming' || status === 'pending';
    });
  }, [paymentReminders]);

  const netBalance = totalIncome - totalExpenses;
  const showGettingStarted = isFirstTimeUser === true;

  // Monthly wrap prompt state and effect must live before any early returns (Rules of Hooks).
  const [showWrapPrompt, setShowWrapPrompt] = useState(false);
  const [showWrapModal, setShowWrapModal] = useState(false);

  useEffect(() => {
    const today = new Date();
    if (today.getDate() !== 1) return;

    const dismissKey = `wrapPromptDismissed_${today.getFullYear()}_${today.getMonth() + 1}`;
    const dismissed = localStorage.getItem(dismissKey);
    if (!dismissed && !isFirstTimeUser && totalExpenses > 0) {
      setShowWrapPrompt(true);
    }
  }, [isFirstTimeUser, totalExpenses]);

  // While the first-time-user check is still resolving, render a skeleton that
  // mirrors the Dashboard's visual layout so neither the regular dashboard nor
  // the getting-started UI flashes before we know which one to show.
  if (isFirstTimeUser === null) {
    return (
      <div className="min-h-screen relative">
        <ParticlesBackground />
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 space-y-6 pb-24 pt-4">
          {/* Greeting row */}
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-3 w-56 rounded-md" />
            </div>
          </div>
          {/* Hero balance card */}
          <Skeleton className="rounded-3xl h-44 w-full" />
          {/* Section block (health score / getting-started) */}
          <Skeleton className="rounded-3xl h-36 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <ParticlesBackground />
      <PullToRefresh onRefresh={handleRefresh} className="h-full relative z-10">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">


          <motion.main
            className="px-4 space-y-6 pb-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ willChange: 'opacity' }}
          >
            <StreamingGreeting isFirstTimeUser={showGettingStarted} />
            {/* Hero Section - Wallet Overview */}
            <motion.section
              key="hero-section"
              initial={{ opacity: 1, y: 0 }}
              style={{ willChange: 'auto' }}
            >
              <div
                className={cn(
                  "rounded-3xl p-4 px-5 shadow-xl relative overflow-hidden transition-all",
                  variant === 'cyberpunk'
                    ? "card-3d bg-card border-none"
                    : "bg-[image:var(--gradient-balance)] text-white",
                  useDarkText ? "text-foreground" : "text-white"
                )}
                style={{ contain: 'layout', willChange: 'transform' }}
              >
                <div
                  className={cn(
                    "absolute top-0 right-0 w-64 h-64 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none",
                    useDarkText ? "bg-primary/10" : "bg-white/10"
                  )}
                  style={{ willChange: 'filter', transform: 'translateZ(0)' }}
                />
                <div
                  className={cn(
                    "absolute bottom-0 left-0 w-48 h-48 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none",
                    useDarkText ? "bg-accent/10" : "bg-black/10"
                  )}
                  style={{ willChange: 'filter', transform: 'translateZ(0)' }}
                />

                <div className="relative z-10 flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                      <div
                        className={cn(
                          "p-1.5 rounded-lg backdrop-blur-sm",
                          useDarkText ? "bg-primary/20" : "bg-white/20"
                        )}
                        style={{ willChange: 'backdrop-filter', transform: 'translateZ(0)' }}
                      >
                        <Wallet className={cn("w-4 h-4", useDarkText ? "text-primary" : "text-white")} weight="fill" />
                      </div>
                      <span className="text-sm font-medium tracking-wide">Main Balance</span>
                    </div>
                    <h2 className={cn("text-3xl font-black tracking-tight mb-1", variant === 'cyberpunk' && !useDarkText && "text-glow")}>
                      {formatAmount(netBalance)}
                    </h2>
                  </div>
                  <div className="flex flex-col items-end">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-md rounded-full text-xs font-bold ring-1 shadow-sm",
                        useDarkText ? "bg-muted/30 ring-border" : "bg-white/20 ring-white/30"
                      )}
                      style={{ willChange: 'backdrop-filter', transform: 'translateZ(0)' }}
                    >
                      <TrendUp className={cn("w-3.5 h-3.5", useDarkText ? "text-green-600" : "text-emerald-300")} weight="bold" />
                      <span>Today {formatAmount(todayNet)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={cn(
                      "group p-3 rounded-2xl backdrop-blur-sm border transition-colors",
                      useDarkText
                        ? "bg-muted/20 border-border hover:bg-muted/30"
                        : "bg-black/20 border-white/10 hover:bg-black/30"
                    )}
                    style={{ willChange: 'backdrop-filter', transform: 'translateZ(0)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("p-1.5 rounded-full", useDarkText ? "bg-red-500/20" : "bg-rose-500/20")}>
                        <TrendDown className={cn("w-3.5 h-3.5", useDarkText ? "text-red-600" : "text-rose-300")} weight="bold" />
                      </div>
                      <span className={cn("text-xs font-bold uppercase tracking-wider", useDarkText ? "text-foreground/70" : "text-white/70")}>Expenses</span>
                    </div>
                    <p className={cn("text-base font-bold tracking-tight", useDarkText ? "text-foreground" : "text-white")}>{formatAmount(totalExpenses)}</p>
                  </div>
                  <div
                    className={cn(
                      "group p-3 rounded-2xl backdrop-blur-sm border transition-colors",
                      useDarkText
                        ? "bg-muted/20 border-border hover:bg-muted/30"
                        : "bg-black/20 border-white/10 hover:bg-black/30"
                    )}
                    style={{ willChange: 'backdrop-filter', transform: 'translateZ(0)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("p-1.5 rounded-full", useDarkText ? "bg-green-500/20" : "bg-emerald-500/20")}>
                        <TrendUp className={cn("w-3.5 h-3.5", useDarkText ? "text-green-600" : "text-emerald-300")} weight="bold" />
                      </div>
                      <span className={cn("text-xs font-bold uppercase tracking-wider", useDarkText ? "text-foreground/70" : "text-white/70")}>Income</span>
                    </div>
                    <p className={cn("text-base font-bold tracking-tight", useDarkText ? "text-foreground" : "text-white")}>{formatAmount(totalIncome)}</p>
                  </div>
                </div>
              </div>
            </motion.section>

            {!showGettingStarted && (
              <motion.section
                key="debt-triage-section"
                initial={{ opacity: 1, y: 0 }}
                style={{ willChange: 'auto' }}
              >
                <DebtTriageWidget />
              </motion.section>
            )}

            {!showGettingStarted && <HealthScoreCard />}

            {showGettingStarted && (
              <motion.section
                key="getting-started-section"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-3xl p-5 border border-border/50 shadow-card"
              >
                <h2 className="text-lg font-black tracking-tight text-foreground mb-1">Get Started</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Your account is ready. Add real data with these steps to unlock insights.
                </p>

                <div className="space-y-2 mb-4">
                  <div className="text-sm text-foreground">1. Add your first transaction</div>
                  <div className="text-sm text-foreground">2. Create a budget limit</div>
                  <div className="text-sm text-foreground">3. Set a savings goal</div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => window.dispatchEvent(new Event('open-input-sheet'))}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card/50 px-3 py-3 hover:bg-muted/50 transition-all hover:border-accent/30 hover:shadow-sm group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Add</span>
                  </button>
                  <button
                    onClick={() => navigate('/budget')}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card/50 px-3 py-3 hover:bg-muted/50 transition-all hover:border-accent/30 hover:shadow-sm group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Wallet className="w-4 h-4 text-violet-500" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Budget</span>
                  </button>
                  <button
                    onClick={() => navigate('/savings')}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card/50 px-3 py-3 hover:bg-muted/50 transition-all hover:border-accent/30 hover:shadow-sm group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <PiggyBank className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Goal</span>
                  </button>
                  <button
                    onClick={() => navigate('/debts')}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card/50 px-3 py-3 hover:bg-muted/50 transition-all hover:border-accent/30 hover:shadow-sm group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Handshake className="w-4 h-4 text-rose-500" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Debt</span>
                  </button>
                </div>
              </motion.section>
            )}

            {/* Upgrade to Pro Banner - Only for non-premium users */}
            {/* Upgrade to Pro Banner - Compact & Premium */}
            <AnimatePresence mode="wait">
              {!showGettingStarted && !subscriptionLoading && !isPremium && (
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

            {/* Monthly Wrap Prompt */}
            <AnimatePresence>
              {showWrapPrompt && !showGettingStarted && (
                <motion.section
                  key="wrap-prompt"
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative rounded-2xl p-4 border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 overflow-hidden">
                    <button
                      className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        const today = new Date();
                        const dismissKey = `wrapPromptDismissed_${today.getFullYear()}_${today.getMonth() + 1}`;
                        localStorage.setItem(dismissKey, '1');
                        setShowWrapPrompt(false);
                      }}
                      aria-label="Dismiss"
                    >
                      <span className="text-lg leading-none">×</span>
                    </button>
                    <div className="flex items-center gap-3 pr-6">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <TrendUp className="w-5 h-5 text-indigo-400" weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-foreground">New month, new start!</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Share your {format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'MMMM')} recap with friends.</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setShowWrapPrompt(false);
                          setShowWrapModal(true);
                        }}
                        className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-xs font-black"
                      >
                        Share
                      </motion.button>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Payment Reminders Section */}
            {!showGettingStarted && activeReminders.length > 0 && (
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
                <PaymentReminderCarousel reminders={activeReminders} />
              </motion.section>
            )}

            {!showGettingStarted && (
              <motion.section
                key="savings-snapshot-section"
                initial={{ opacity: 1, y: 0 }}
                style={{ willChange: 'auto' }}
              >
                <SavingsSnapshotCard
                  onViewAll={() => navigate('/savings')}
                  onCreateFirst={() => navigate('/savings')}
                />
              </motion.section>
            )}

            {/* Analytics Section */}
            {!showGettingStarted && (
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
            )}

            {/* Monthly Reports Preview */}
            {!showGettingStarted && (
            <motion.section
              key="transactions-section"
              initial={{ opacity: 1, y: 0 }}
              style={{ willChange: 'auto' }}
              className="pb-4"
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 font-black tracking-tight">
                  <ClockCounterClockwise className="w-5 h-5 text-primary" weight="duotone" />
                  Activity History
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    NEW
                  </span>
                </h2>
                <motion.button
                  onClick={() => navigate('/activity')}
                  className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-accent transition-colors"
                  whileHover={{ x: 4 }}
                >
                  View All
                  <ArrowRight className="w-4 h-4" weight="duotone" />
                </motion.button>
              </div>
              <div className="bg-card rounded-2xl p-3 space-y-2 shadow-sm">
                {transactions.length > 0 || activityLogs.length > 0 ? (
                  <>
                    {/* Debt/Settlement activities */}
                    {activityLogs.filter(a => ['debt_created', 'debt_settled', 'debt_updated', 'debt_deleted'].includes(a.activity_type)).map((activity) => {
                      const isSettled = activity.activity_type === 'debt_settled';
                      const isDeleted = activity.activity_type === 'debt_deleted';
                      const isCreated = activity.activity_type === 'debt_created';
                      const isPositive = activity.activity_type === 'debt_settled' || activity.activity_type === 'debt_created';
                      
                      return (
                        <div 
                          key={activity.id}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate('/debts')}
                        >
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                            isSettled ? 'bg-emerald-500/10' : isDeleted ? 'bg-gray-500/10' : 'bg-rose-500/10'
                          )}>
                            {isSettled 
                              ? <CheckCircle className="w-5 h-5 text-emerald-500" weight="fill" />
                              : isDeleted 
                                ? <Trash className="w-5 h-5 text-gray-500" />
                                : <Handshake className="w-5 h-5 text-rose-500" weight="fill" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), 'h:mm a')}
                            </p>
                          </div>
                          {activity.amount && (
                            <span className={cn(
                              'text-sm font-semibold',
                              isPositive ? 'text-emerald-500' : 'text-rose-500'
                            )}>
                              {activity.currency} {activity.amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {/* Transaction items */}
                    {transactions.map((tx, idx) => (
                      <TransactionItem
                        key={tx.id}
                        transaction={tx}
                        index={idx}
                        onEdit={setEditingTransaction}
                        onDelete={setDeletingTransaction}
                        revealedId={revealedTransactionId}
                        onReveal={setRevealedTransactionId}
                      />
                    ))}
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Sparkle className="w-8 h-8 text-muted-foreground/30" weight="duotone" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No activity yet. Start adding your expenses!</p>
                  </div>
                )}
              </div>
            </motion.section>
            )}
          </motion.main>
        </div>
      </PullToRefresh>



      <EditTransactionModal
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
        onSuccess={() => {
          void handleRefresh();
        }}
      />

      <DeleteTransactionDialog
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
        transaction={deletingTransaction}
        onSuccess={() => {
          void handleRefresh();
        }}
      />

      <ManageRemindersModal
        open={showAddPaymentReminder}
        onOpenChange={setShowAddPaymentReminder}
        reminders={activeReminders}
        onRefresh={refetchReminders}
      />

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        source="dashboard_banner"
      />

      {/* Monthly Wrap Modal */}
      <AnimatePresence>
        {showWrapModal && (
          <motion.div
            className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowWrapModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-sm"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            >
              <button
                onClick={() => setShowWrapModal(false)}
                className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <span className="text-muted-foreground font-bold text-lg leading-none">×</span>
              </button>
              <MonthlyWrapCard
                month={getMonth(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)) + 1}
                year={getYear(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1))}
                totalSaved={netBalance}
                budgetWeeksUnder={0}
                expenseStreak={transactions.length}
                currency={currency}
                formattedTotalSaved={formatAmount(Math.abs(netBalance))}
                formattedTotalExpenses={formatAmount(totalExpenses)}
                formattedTotalIncome={formatAmount(totalIncome)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
