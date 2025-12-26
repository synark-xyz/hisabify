import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CreditCard } from '@/components/CreditCard';
import { TransactionItem } from '@/components/TransactionItem';
import { AnalyticsChart } from '@/components/AnalyticsChart';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddCardModal } from '@/components/AddCardModal';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, Transaction, MonthlySpending } from '@/types';
import { format, subMonths } from 'date-fns';

export function Dashboard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlySpending[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MMM'));
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchCards();
      fetchTransactions();
    }
  }, [user]);

  useEffect(() => {
    if (transactions.length > 0) {
      generateMonthlyData();
    }
  }, [transactions]);

  const fetchCards = async () => {
    if (!user) return;
    const { data, error } = await supabase
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

  const generateMonthlyData = () => {
    const months = Array.from({ length: 7 }, (_, i) => {
      const date = subMonths(new Date(), 6 - i);
      return {
        month: format(date, 'MMM'),
        amount: Math.floor(Math.random() * 3000) + 1000,
      };
    });
    setMonthlyData(months);
  };

  const totalBalance = cards.reduce((sum, card) => sum + Number(card.balance), 0);

  const handleAddClick = () => {
    if (cards.length === 0) {
      setShowAddCard(true);
    } else {
      setShowAddTransaction(true);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        <Header title="Home" />

        <main className="px-4 space-y-6">
          {/* Balance Card */}
          {cards.length > 0 ? (
            <CreditCard
              card={{
                ...cards[0],
                balance: totalBalance,
              }}
              onClick={() => navigate('/cards')}
            />
          ) : (
            <button
              onClick={() => setShowAddCard(true)}
              className="w-full aspect-[1.6] rounded-2xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-accent transition-colors"
            >
              <span className="text-4xl">💳</span>
              <p className="text-muted-foreground font-medium">Add your first card</p>
            </button>
          )}

          {/* Analytics Section */}
          <section className="animate-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Analytics</h2>
              <button className="flex items-center gap-1 px-3 py-1.5 bg-accent text-accent-foreground rounded-full text-sm font-medium">
                Year - {selectedYear}
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <AnalyticsChart data={monthlyData} selectedMonth={selectedMonth} />
          </section>

          {/* Transactions Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Transactions</h2>
              <button
                onClick={() => navigate('/expenses')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No transactions yet
                </p>
              )}
            </div>
          </section>
        </main>
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
        }}
      />
    </div>
  );
}
