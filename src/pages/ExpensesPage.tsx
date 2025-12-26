import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { WeekCalendar } from '@/components/WeekCalendar';
import { SummaryCard } from '@/components/SummaryCard';
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

  const getCategorySpending = (categoryId: string) => {
    return transactions
      .filter(tx => tx.category_id === categoryId && tx.type === 'expense')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  };

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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        <Header title="Expenses" />

        <main className="px-4 space-y-6">
          {/* Month Selector */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-foreground">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week Calendar */}
          <WeekCalendar
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            hasTransactions={hasTransactions}
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <SummaryCard
              title="Total Salary"
              amount={totalIncome || 7000}
              cardNumber="1965"
              variant="income"
            />
            <SummaryCard
              title="Total Expense"
              amount={totalExpense || 4543.98}
              cardNumber="1965"
              variant="expense"
            />
          </div>

          {/* Expenses by Category */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Expenses</h2>
              <button
                onClick={() => navigate('/analytics')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {Object.keys(categoryGroups).length > 0 ? (
                Object.entries(categoryGroups).map(([catId, group]) => (
                  <BudgetCard
                    key={catId}
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
                ))
              ) : (
                <div className="bg-card rounded-xl p-6 text-center">
                  <p className="text-muted-foreground">No expenses this month</p>
                </div>
              )}
            </div>
          </section>
        </main>
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
