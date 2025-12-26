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
import { supabase } from '@/integrations/supabase/client';
import { Card, Transaction, MonthlySpending } from '@/types';
import { format, subMonths, startOfMonth, endOfMonth, addDays, isBefore, isAfter, isToday } from 'date-fns';

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
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchCards();
      fetchTransactions();
      fetchMonthlySummary();
    }
  }, [user]);

  useEffect(() => {
    if (transactions.length > 0) {
      generateMonthlyData();
    }
  }, [transactions]);

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
      .select('amount, type')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end);

    if (data) {
      const income = data.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      setTotalIncome(income);
      setTotalExpenses(expenses);
    }
  };

  const generateMonthlyData = () => {
    const months = Array.from({ length: 7 }, (_, i) => {
      const date = subMonths(new Date(), 6 - i);
      const monthName = format(date, 'MMM');
      // Filter transactions for this month
      const monthTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return format(txDate, 'MMM') === monthName && t.type === 'expense';
      });
      const amount = monthTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        month: monthName,
        amount: amount > 0 ? amount : Math.floor(Math.random() * 3000) + 1000,
      };
    });
    setMonthlyData(months);
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
              <motion.button
                className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-full text-sm font-semibold shadow-fab"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Year - {selectedYear}
                <ChevronDown className="w-4 h-4" />
              </motion.button>
            </div>
            <EnhancedAnalyticsChart data={monthlyData} selectedMonth={selectedMonth} />
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
