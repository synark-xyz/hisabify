import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonthCalendar } from '@/components/MonthCalendar';
import { SwipeableWeekCalendar } from '@/components/SwipeableWeekCalendar';
import { ExpenseOverview } from '@/components/ExpenseOverview';
import { ExpenseDonutChart } from '@/components/ExpenseDonutChart';
import { TransactionItem } from '@/components/TransactionItem';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { DeleteTransactionDialog } from '@/components/DeleteTransactionDialog';
import { AddPaymentReminderModal } from '@/components/AddPaymentReminderModal';
import { PullToRefresh } from '@/components/PullToRefresh';
import { getTransactionCategoryName, getTransactionCategoryColor, isRealExpense } from '@/lib/transactionUtils';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useTheme } from '@/hooks/useTheme';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, CategorySpending, Card, Category } from '@/types';
import { getViewRange, type TransactionViewMode } from '@/lib/transactionDateRange';
import { enforceHistoryWindow } from '@/lib/historyLimits';
import { emitTransactionUpdated } from '@/lib/transaction-events';
import { useTransactionUpdateListener } from '@/hooks/useTransactionUpdateListener';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  setYear,
  setMonth,
  addDays,
  subDays,
  addYears,
  subYears,
} from 'date-fns';

interface ConvertedTransaction extends Transaction {
  convertedAmount: number;
}

const FILTERABLE_TYPES = ['all', 'expense', 'income', 'lend', 'owe'] as const;
type FilterType = typeof FILTERABLE_TYPES[number];

export function ExpensesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<TransactionViewMode>('week');
  const [transactions, setTransactions] = useState<ConvertedTransaction[]>([]);
  const [showTransactionList, setShowTransactionList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cardFilter, setCardFilter] = useState<string>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [reminderTransaction, setReminderTransaction] = useState<Transaction | null>(null);
  const [revealedTransactionId, setRevealedTransactionId] = useState<string | null>(null);
  const latestRequestIdRef = useRef(0);
  const hasShownHistoryClampToastRef = useRef(false);
  // Deferred category name filter — applied once categories are loaded
  const pendingCategoryNameRef = useRef<string | null>(null);

  const { user } = useAuth();
  const { currency, currencyVersion } = useCurrency();
  const { convertAmount } = useExchangeRate();
  const { variant } = useTheme();
  const { isPremium } = useSubscription();
  const { toast } = useToast();

  // ── Apply URL search params on mount ────────────────────────────────────
  useEffect(() => {
    const category = searchParams.get('category');
    const categoryName = searchParams.get('categoryName');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const mode = searchParams.get('viewMode') as TransactionViewMode | null;

    let hasParams = false;

    if (category) {
      setCategoryFilter(category);
      hasParams = true;
    }

    if (categoryName) {
      // Defer until categories are loaded from transactions
      pendingCategoryNameRef.current = categoryName;
      hasParams = true;
    }

    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        setAnchorDate(fromDate);
        hasParams = true;
      }
    }

    if (mode && ['day', 'week', 'month', 'year'].includes(mode)) {
      setViewMode(mode);
      hasParams = true;
    } else if (from && to) {
      // Infer view mode from date range
      const fromDate = new Date(from);
      const toDate = new Date(to);
      const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) setViewMode('day');
      else if (diffDays <= 7) setViewMode('week');
      else if (diffDays <= 31) setViewMode('month');
      else setViewMode('year');
      hasParams = true;
    }

    // Clear params after applying to avoid stale state on refresh
    if (hasParams) {
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (viewMode === 'day') {
      setFocusedDate(anchorDate);
      return;
    }

    setFocusedDate(null);
  }, [viewMode, anchorDate]);

  const viewRange = useMemo(() => getViewRange(viewMode, anchorDate), [viewMode, anchorDate]);

  const fetchTransactions = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;

    if (!user) {
      if (requestId === latestRequestIdRef.current) {
        setTransactions([]);
      }
      return;
    }

    const enforcement = enforceHistoryWindow(
      { from: viewRange.start, to: viewRange.end },
      isPremium
    );
    const effectiveRange = enforcement.range;

    if (enforcement.wasClamped && !hasShownHistoryClampToastRef.current) {
      hasShownHistoryClampToastRef.current = true;
      toast({
        title: 'History limit reached',
        description: 'Free plan supports the last 30 days. Upgrade for full history.',
      });
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*, category:categories(*), card:cards(*)')
      .eq('user_id', user.id)
      .gte('date', effectiveRange.from.toISOString())
      .lte('date', effectiveRange.to.toISOString())
      .order('date', { ascending: false });

    if (error || !data || requestId !== latestRequestIdRef.current) {
      return;
    }

    const convertedData = await Promise.all(
      (data as Transaction[]).map(async (tx) => {
        const storedCurrency = tx.currency_base || 'USD';
        if (storedCurrency === currency) {
          return { ...tx, convertedAmount: Number(tx.amount) };
        }

        const result = await convertAmount(Number(tx.amount), storedCurrency, currency);
        return {
          ...tx,
          convertedAmount: result ? result.convertedAmount : Number(tx.amount),
        };
      })
    );

    if (requestId === latestRequestIdRef.current) {
      setTransactions(convertedData);
    }
  }, [user, viewRange, currency, convertAmount, isPremium, toast]);

  const handleRefresh = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  useTransactionUpdateListener(() => {
    void fetchTransactions();
  });

  useEffect(() => {
    if (user) {
      void fetchTransactions();
    }
  }, [user, currencyVersion, fetchTransactions]);

  const effectiveFocusedDate = focusedDate ?? (viewMode === 'day' ? anchorDate : null);

  const hasTransactions = useCallback(
    (date: Date) => transactions.some((tx) => isSameDay(new Date(tx.date), date)),
    [transactions]
  );

  const rangeTransactions = useMemo(
    () =>
      transactions.filter((tx) => {
        const txDate = new Date(tx.date);
        return txDate >= viewRange.start && txDate <= viewRange.end;
      }),
    [transactions, viewRange]
  );

  const listBaseTransactions = useMemo(() => {
    if (effectiveFocusedDate) {
      return rangeTransactions.filter((tx) => isSameDay(new Date(tx.date), effectiveFocusedDate));
    }

    return rangeTransactions;
  }, [effectiveFocusedDate, rangeTransactions]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, Category>();
    for (const tx of rangeTransactions) {
      if (tx.category?.id && !map.has(tx.category.id)) {
        map.set(tx.category.id, tx.category);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rangeTransactions]);

  const cardOptions = useMemo(() => {
    const map = new Map<string, Card>();
    for (const tx of rangeTransactions) {
      if (tx.card?.id && !map.has(tx.card.id)) {
        map.set(tx.card.id, tx.card);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.card_holder.localeCompare(b.card_holder));
  }, [rangeTransactions]);

  // Resolve deferred categoryName filter once categories are loaded
  useEffect(() => {
    if (pendingCategoryNameRef.current && categoryOptions.length > 0) {
      const name = pendingCategoryNameRef.current.toLowerCase();
      const match = categoryOptions.find((c) => c.name.toLowerCase() === name);
      if (match) {
        setCategoryFilter(match.id);
      }
      pendingCategoryNameRef.current = null;
    }
  }, [categoryOptions]);

  useEffect(() => {
    if (categoryFilter === 'all') {
      return;
    }

    const categoryExists = categoryOptions.some((category) => category.id === categoryFilter);
    if (!categoryExists && !pendingCategoryNameRef.current) {
      setCategoryFilter('all');
    }
  }, [categoryFilter, categoryOptions]);

  useEffect(() => {
    if (cardFilter === 'all') {
      return;
    }

    const cardExists = cardOptions.some((card) => card.id === cardFilter);
    if (!cardExists) {
      setCardFilter('all');
    }
  }, [cardFilter, cardOptions]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return listBaseTransactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }

      if (categoryFilter !== 'all' && tx.category_id !== categoryFilter) {
        return false;
      }

      if (cardFilter !== 'all' && tx.card_id !== cardFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const merchant = tx.merchant.toLowerCase();
      const note = (tx.note || '').toLowerCase();
      const categoryName = (tx.category?.name || '').toLowerCase();

      return merchant.includes(query) || note.includes(query) || categoryName.includes(query);
    });
  }, [listBaseTransactions, searchQuery, typeFilter, categoryFilter, cardFilter]);

  const totalIncome = filteredTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.convertedAmount, 0);

  const totalExpense = filteredTransactions
    .filter(isRealExpense)
    .reduce((sum, tx) => sum + tx.convertedAmount, 0);

  const categoryData: CategorySpending[] = Object.values(
    filteredTransactions
      .filter(isRealExpense)
      .reduce((acc, tx) => {
        const catName = getTransactionCategoryName(tx);
        const catColor = getTransactionCategoryColor(tx);

        if (!acc[catName]) {
          acc[catName] = { name: catName, amount: 0, color: catColor, percentage: 0 };
        }

        acc[catName].amount += tx.convertedAmount;
        return acc;
      }, {} as Record<string, CategorySpending>)
  )
    .map((cat) => ({
      ...cat,
      percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const timeframeKey = effectiveFocusedDate
    ? `day-${effectiveFocusedDate.toISOString().split('T')[0]}`
    : `${viewMode}-${anchorDate.toISOString().split('T')[0]}`;

  const availableYears = useMemo(() => {
    const years = new Set<number>([anchorDate.getFullYear()]);
    for (const tx of transactions) {
      years.add(new Date(tx.date).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, anchorDate]);

  const handleDateSelect = useCallback(
    (date: Date) => {
      if (viewMode !== 'day' && effectiveFocusedDate && isSameDay(date, effectiveFocusedDate)) {
        setFocusedDate(null);
        return;
      }

      setAnchorDate(date);
      setFocusedDate(date);
    },
    [viewMode, effectiveFocusedDate]
  );

  const handleWeekChange = useCallback(
    (direction: 'prev' | 'next') => {
      setAnchorDate((prev) => {
        const nextDate = direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);

        if (viewMode === 'day') {
          setFocusedDate(nextDate);
        } else {
          setFocusedDate(null);
        }

        return nextDate;
      });
    },
    [viewMode]
  );

  const handleMonthChange = useCallback((direction: 'prev' | 'next') => {
    setAnchorDate((prev) => (direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)));
    setFocusedDate(null);
  }, []);

  const handlePeriodChange = useCallback(
    (direction: 'prev' | 'next') => {
      if (viewMode === 'day') {
        setAnchorDate((prev) => {
          const nextDate = direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1);
          setFocusedDate(nextDate);
          return nextDate;
        });
        return;
      }

      if (viewMode === 'week') {
        handleWeekChange(direction);
        return;
      }

      if (viewMode === 'month') {
        handleMonthChange(direction);
        return;
      }

      setAnchorDate((prev) => (direction === 'prev' ? subYears(prev, 1) : addYears(prev, 1)));
      setFocusedDate(null);
    },
    [viewMode, handleWeekChange, handleMonthChange]
  );

  const handleViewModeChange = useCallback(
    (nextMode: TransactionViewMode) => {
      setViewMode(nextMode);
      if (nextMode !== 'day') {
        setFocusedDate(null);
      }
    },
    []
  );

  const handleTransactionMutationSuccess = useCallback(() => {
    emitTransactionUpdated();
  }, []);

  const clearFocusedDate = useCallback(() => {
    setFocusedDate(null);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const isDateFocused = effectiveFocusedDate !== null;

  return (
    <div className={cn('min-h-screen', variant === 'cyberpunk' ? 'bg-transparent' : 'bg-background')}>
      <PullToRefresh onRefresh={handleRefresh} className="h-full pb-page-content fade-bottom-overlay">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">
          <motion.main
            className="px-4 space-y-6 pb-24"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <motion.button
                  onClick={() => handlePeriodChange('prev')}
                  className="p-2.5 hover:bg-muted rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>

                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-col items-center -space-y-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <motion.button
                          className="flex items-center gap-1 px-3 py-1 rounded-full hover:bg-accent/10 transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="text-sm font-semibold text-muted-foreground">
                            {format(anchorDate, 'yyyy')}
                          </span>
                          <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        </motion.button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        {availableYears.map((year) => (
                          <DropdownMenuItem
                            key={year}
                            onClick={() => setAnchorDate(setYear(anchorDate, year))}
                            className={anchorDate.getFullYear() === year ? 'bg-accent/10' : ''}
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
                          <span className="text-xl font-bold text-foreground">{format(anchorDate, 'MMMM')}</span>
                          <ChevronDown className="w-4 h-4 text-foreground" />
                        </motion.button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="max-h-[300px] overflow-y-auto">
                        {Array.from({ length: 12 }, (_, i) => i).map((monthIndex) => {
                          const monthDate = setMonth(new Date(), monthIndex);
                          return (
                            <DropdownMenuItem
                              key={monthIndex}
                              onClick={() => setAnchorDate(setMonth(anchorDate, monthIndex))}
                              className={anchorDate.getMonth() === monthIndex ? 'bg-accent/10' : ''}
                            >
                              {format(monthDate, 'MMMM')}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-full">
                    <button
                      onClick={() => handleViewModeChange('day')}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                        viewMode === 'day'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => handleViewModeChange('week')}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                        viewMode === 'week'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => handleViewModeChange('month')}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                        viewMode === 'month'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => handleViewModeChange('year')}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                        viewMode === 'year'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Yearly
                    </button>
                  </div>
                </div>

                <motion.button
                  onClick={() => handlePeriodChange('next')}
                  className="p-2.5 hover:bg-muted rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>

              <AnimatePresence mode="wait">
                {viewMode === 'week' || viewMode === 'day' ? (
                  <motion.div
                    key="week-calendar"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <SwipeableWeekCalendar
                      currentDate={anchorDate}
                      selectedDate={effectiveFocusedDate}
                      onDateSelect={handleDateSelect}
                      onWeekChange={handleWeekChange}
                      hasTransactions={hasTransactions}
                    />
                  </motion.div>
                ) : viewMode === 'month' ? (
                  <motion.div
                    key="month-calendar"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <MonthCalendar
                      currentDate={anchorDate}
                      selectedDate={effectiveFocusedDate}
                      onDateSelect={handleDateSelect}
                      onMonthChange={setAnchorDate}
                      hasTransactions={hasTransactions}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="year-view"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="text-center py-4 text-muted-foreground text-sm"
                  >
                    Viewing all transactions for {anchorDate.getFullYear()}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {isDateFocused
                      ? 'Daily Overview'
                      : viewMode === 'day'
                        ? 'Daily Overview'
                        : viewMode === 'week'
                          ? 'Weekly Overview'
                          : viewMode === 'month'
                            ? 'Monthly Overview'
                            : 'Yearly Overview'}
                  </span>
                  {isDateFocused && effectiveFocusedDate && (
                    <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full font-medium">
                      {format(effectiveFocusedDate, 'MMM d')}
                    </span>
                  )}
                </div>
                {focusedDate && viewMode !== 'day' && (
                  <motion.button
                    onClick={clearFocusedDate}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-destructive bg-muted/30 hover:bg-destructive/10 rounded-full transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </motion.button>
                )}
              </div>
              <ExpenseOverview totalSalary={totalIncome} totalExpense={totalExpense} />
            </motion.div>

            <motion.section variants={itemVariants} className="space-y-3">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by description, note, or category"
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Select value={typeFilter} onValueChange={(value: FilterType) => setTypeFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="lend">Lend</SelectItem>
                    <SelectItem value="owe">Owe</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={cardFilter} onValueChange={setCardFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Card" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cards</SelectItem>
                    {cardOptions.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.card_holder} •••• {card.last_four || card.card_number.slice(-4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                    setCategoryFilter('all');
                    setCardFilter('all');
                  }}
                  className="text-sm rounded-md border border-border px-3 py-2 hover:bg-muted transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </motion.section>

            <motion.section variants={itemVariants}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">
                  {isDateFocused
                    ? 'Daily Analytics'
                    : viewMode === 'day'
                      ? 'Daily Analytics'
                      : viewMode === 'week'
                        ? 'Weekly Analytics'
                        : viewMode === 'month'
                          ? 'Monthly Analytics'
                          : 'Yearly Analytics'}
                </h2>
                <motion.button
                  onClick={() => setShowTransactionList(!showTransactionList)}
                  className="text-sm text-muted-foreground hover:text-accent transition-colors"
                  whileHover={{ x: 4 }}
                >
                  {showTransactionList ? 'Show Chart' : 'View All'}
                </motion.button>
              </div>

              <AnimatePresence mode="wait">
                {showTransactionList ? (
                  <motion.div
                    key="transaction-list"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((tx, index) => (
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
                            onAddReminder={setReminderTransaction}
                            revealedId={revealedTransactionId}
                            onReveal={setRevealedTransactionId}
                          />
                        </motion.div>
                      ))
                    ) : (
                      <div className="bg-card rounded-2xl p-8 text-center shadow-card">
                        <span className="text-5xl">💸</span>
                        <p className="text-muted-foreground mt-3">No transactions found</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search or filters</p>
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
        onSuccess={handleTransactionMutationSuccess}
      />

      <DeleteTransactionDialog
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
        transaction={deletingTransaction}
        onSuccess={handleTransactionMutationSuccess}
      />

      <AddPaymentReminderModal
        open={!!reminderTransaction}
        onOpenChange={(open) => !open && setReminderTransaction(null)}
        onSuccess={() => setReminderTransaction(null)}
        initialData={reminderTransaction ? {
          title: reminderTransaction.merchant,
          amount: reminderTransaction.amount_original ?? reminderTransaction.amount,
          currency: reminderTransaction.currency_original ?? reminderTransaction.currency_base ?? undefined,
        } : undefined}
      />
    </div>
  );
}
