import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WeekCalendar } from '@/components/WeekCalendar';
import { ExpenseDonutChart } from '@/components/ExpenseDonutChart';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, CategorySpending } from '@/types';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay } from 'date-fns';

export function AnalyticsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchTransactions();
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
      .eq('type', 'expense')
      .gte('date', start)
      .lte('date', end);

    if (data) setTransactions(data as unknown as Transaction[]);
  };

  const hasTransactions = (date: Date) => {
    return transactions.some(tx => isSameDay(new Date(tx.date), date));
  };

  const totalExpense = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

  const categoryData: CategorySpending[] = Object.values(
    transactions.reduce((acc, tx) => {
      const catName = tx.category?.name || 'Other';
      const catColor = tx.category?.color || '#6B7280';
      
      if (!acc[catName]) {
        acc[catName] = { category: catName, amount: 0, color: catColor, percentage: 0 };
      }
      acc[catName].amount += Number(tx.amount);
      return acc;
    }, {} as Record<string, CategorySpending>)
  ).map(cat => ({
    ...cat,
    percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0,
  }));

  const salaryPercentage = totalExpense > 0 ? Math.min((totalExpense / 7000) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Total Expense</h1>
          <div className="w-10" />
        </header>

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

          {/* Spending Summary */}
          <div className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-muted-foreground">
                You have Spend{' '}
                <span className="text-accent font-bold text-xl">
                  ${totalExpense.toLocaleString()}
                </span>
                <br />
                this month.
              </p>
              <span className="text-sm text-muted-foreground">
                {format(currentDate, 'MMMM, yyyy')}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="text-accent font-semibold">{salaryPercentage.toFixed(2)}%</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${salaryPercentage}%` }}
                />
              </div>
              <span className="text-muted-foreground">{(100 - salaryPercentage).toFixed(2)}%</span>
            </div>
          </div>

          {/* Analytics Chart */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Analytics</h2>
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                View All
              </button>
            </div>

            {categoryData.length > 0 ? (
              <ExpenseDonutChart data={categoryData} />
            ) : (
              <div className="bg-card rounded-xl p-8 text-center">
                <p className="text-muted-foreground">No expense data for this month</p>
              </div>
            )}
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
