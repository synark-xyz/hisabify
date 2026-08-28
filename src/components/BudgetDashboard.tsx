import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataErrorState } from '@/components/ErrorState';
import { useBudgets, BudgetWithSpending, Budget } from '@/hooks/useBudgets';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useCurrency } from '@/hooks/useCurrency';
import { BudgetProgressCard } from '@/components/BudgetProgressCard';
import { BudgetTransactionsSheet } from '@/components/BudgetTransactionsSheet';
import { BudgetHistoryChart } from '@/components/BudgetHistoryChart';
import { PremiumGuard } from '@/components/PremiumGuard';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category } from '@/types';
import { AddBudgetModal } from '@/components/AddBudgetModal';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { DeleteBudgetDialog } from '@/components/DeleteBudgetDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PrivacyMask } from '@/components/ui/privacy-mask';
import { useNumberTranslation } from '@/lib/i18nNumber';
import { use } from 'i18next';

interface BudgetCategoryOption {
  id: string;
  name: string;
}


/**
 * BudgetDashboard component
 *
 * This component displays the user's active budgets and their
 * respective spending amounts. It also provides a summary of the
 * user's total budget, total spent, and total remaining. The
 * component allows users to add new budgets, edit existing ones,
 * and delete budgets.
 *
 * The component also includes a premium-gated history chart that
 * displays the user's spending over time.
 *
 * The component is a container component that holds all the
 * budget-related features.
 */
export function BudgetDashboard() {
  const { t } = useTranslation();
  const { tn } = useNumberTranslation();
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<BudgetWithSpending | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<BudgetCategoryOption[]>([]);
  const [drillDownBudget, setDrillDownBudget] = useState<BudgetWithSpending | null>(null);
  const [payingBudget, setPayingBudget] = useState<BudgetWithSpending | null>(null);

  const { budgets, loading, error, deleteBudget, copyBudgetToNextPeriod, refetch } = useBudgets();
  const { activeGoals } = useSavingsGoals();
  const { formatAmount } = useCurrency();
  const { isPremium } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id,name')
          .eq('is_system_category', false);
        if (error) throw error;
        if (data) {
          setCategories(data.map((row) => ({ id: row.id, name: row.name } as BudgetCategoryOption)));
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        // Continue with empty categories - budgets will still work
      }
    };
    fetchCategories();
  }, []);

  // Calculate summary stats
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const handleEdit = (budget: BudgetWithSpending) => {
    setEditingBudget(budget);
    setShowAddBudget(true);
  };

  const handleDelete = (budget: BudgetWithSpending) => {
    setDeletingBudget(budget);
  };

  const confirmDelete = async () => {
    if (deletingBudget) {
      await deleteBudget(deletingBudget.id);
      setDeletingBudget(null);
    }
  };

  const closeAddModal = () => {
    setShowAddBudget(false);
    setEditingBudget(null);
  };

  const handleViewInExpenses = (budget: BudgetWithSpending) => {
    const params = new URLSearchParams();
    if (budget.category_id) params.set('category', budget.category_id);
    if (budget.start_date) params.set('from', budget.start_date);
    if (budget.end_date) params.set('to', budget.end_date);
    navigate(`/transactions?${params.toString()}`);
  };

  const handlePayNow = (budget: BudgetWithSpending) => {
    setPayingBudget(budget);
  };

  const handlePayNowSuccess = async () => {
    const budget = payingBudget;
    setPayingBudget(null);
    // For recurring budgets, immediately create the next period so it's ready
    if (budget?.is_recurring) {
      await copyBudgetToNextPeriod(budget.id);
    }
    refetch();
  };

  const handleMoveLeftoverToSavings = (budget: BudgetWithSpending, goalId?: string) => {
    if (activeGoals.length === 0) {
      navigate('/savings');
      return;
    }

    navigate(`/savings?goal=${goalId || activeGoals[0].id}&tab=budget&budget=${budget.id}`);
  };

  const endedBudgetWithRemaining = budgets.find((budget) => budget.remaining > 0 && !!budget.end_date && new Date(budget.end_date) < new Date());
  const savingsReservedByBudget = activeGoals.reduce<Record<string, number>>((accumulator, goal) => {
    if (!goal.linked_budget_id || !goal.reserve_amount) {
      return accumulator;
    }

    accumulator[goal.linked_budget_id] = (accumulator[goal.linked_budget_id] || 0) + goal.reserve_amount;
    return accumulator;
  }, {});


  // Before this, a failed fetch dropped straight through to an empty budget list.
  if (error && !loading) {
    return <DataErrorState error={error} onRetry={refetch} />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:pt-6">
                <Skeleton className="h-3 sm:h-4 w-16 sm:w-24 mb-2" />
                <Skeleton className="h-6 sm:h-8 w-20 sm:w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Local overlay container for Budget page dropdowns/sheets */}
      <div id="budget-overlay-root" className="fixed inset-0 pointer-events-none z-[9999]" />
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('budget.title')}</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground truncate">
                    <PrivacyMask>
                      {formatAmount(totalBudget)}
                    </PrivacyMask>
                  </p>
                </div>
                <div className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('budget.spent')}</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground truncate">
                    <PrivacyMask>
                      {formatAmount(totalSpent)}
                    </PrivacyMask>
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {t('budget.used', { amount: overallPercentage.toFixed(0) }) }
                  </p>
                </div>
                <div className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-destructive/10 items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardContent className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">{t('budget.left')}</p>
                  <p className={cn(
                    "text-lg sm:text-2xl font-bold truncate",
                    totalRemaining >= 0 ? "text-green-500" : "text-destructive"
                  )}>
                    <PrivacyMask>
                      {formatAmount(totalRemaining)}
                    </PrivacyMask>
                  </p>
                </div>
                <div className={cn(
                  "hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-full items-center justify-center flex-shrink-0",
                  totalRemaining >= 0 ? "bg-green-500/10" : "bg-destructive/10"
                )}>
                  <TrendingDown className={cn(
                    "w-5 h-5 sm:w-6 sm:h-6",
                    totalRemaining >= 0 ? "text-green-500" : "text-destructive"
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{t('budget.activeBudgets')}</h2>
          {budgets.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
              {tn(budgets.length)} {budgets.length === 1 ? t('budget.budget_singular') : t('budget.budget_plural')}
            </span>
          )}
        </div>
        <Button
          onClick={() => {
            if (!isPremium && budgets.length >= 1) {
              setShowUpgradeModal(true);
            } else {
              setShowAddBudget(true);
            }
          }}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('budget.addBudget')}
        </Button>
      </div>

      {endedBudgetWithRemaining && (
        <Card className="border-border/50">
          <CardContent className="flex flex-col gap-3 p-4">
            <div>
<p className="text-sm font-semibold text-foreground">
  {t('budget.youHaveUnspent', { amount: formatAmount(endedBudgetWithRemaining.remaining), category: endedBudgetWithRemaining.category?.name || endedBudgetWithRemaining.name || t('budget.totalBudget') })}
</p>
<p className="text-xs text-muted-foreground">{t('budget.moveToSavings')}</p>
            </div>
            {activeGoals.length === 0 ? (
<Button variant="outline" size="sm" className="w-fit rounded-full" onClick={() => navigate('/savings')}>
  {t('budget.createSavingsGoal')}
</Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeGoals.slice(0, 3).map((goal) => (
                  <Button
                    key={goal.id}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => handleMoveLeftoverToSavings(endedBudgetWithRemaining, goal.id)}
                  >
                    {goal.name}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Budget Cards */}
      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets
            .filter((b) => selectedCategory === 'all' ? true : (b.category_id === selectedCategory))
            .map((budget) => (
            <BudgetProgressCard
              key={budget.id}
              budget={budget}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewTransactions={setDrillDownBudget}
              onViewInExpenses={handleViewInExpenses}
              onPayNow={handlePayNow}
              onMoveLeftoverToSavings={handleMoveLeftoverToSavings}
              savingsReserved={savingsReservedByBudget[budget.id] || 0}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
<h3 className="text-lg font-medium text-foreground mb-2">{t('budget.noBudgetsYet')}</h3>
<p className="text-muted-foreground mb-4">
  {t('budget.createFirstBudget')}
</p>
<Button onClick={() => setShowAddBudget(true)}>
  <Plus className="w-4 h-4 mr-2" />
  {t('budget.createBudget')}
</Button>
          </CardContent>
        </Card>
      )}


      {/* Premium-Gated History Chart */}
      <PremiumGuard featureName="Budget History">
        <div className="pt-2">
          <BudgetHistoryChart />
        </div>
      </PremiumGuard>

      {/* Modals */}
      <AddBudgetModal
        open={showAddBudget}
        onOpenChange={closeAddModal}
        editingBudget={editingBudget}
        onSuccess={refetch}
      />

      <DeleteBudgetDialog
        budget={deletingBudget}
        open={!!deletingBudget}
        onOpenChange={(open) => !open && setDeletingBudget(null)}
        onConfirm={confirmDelete}
      />

      <BudgetTransactionsSheet
        budget={drillDownBudget}
        open={!!drillDownBudget}
        onOpenChange={(open) => !open && setDrillDownBudget(null)}
      />

      {/* Pay Now — pre-filled transaction modal for quick budget payment */}
      <AddTransactionModal
        open={!!payingBudget}
        onOpenChange={(open) => !open && setPayingBudget(null)}
        onSuccess={handlePayNowSuccess}
        initialType="expense"
        initialData={{
          merchant: payingBudget?.category?.name || payingBudget?.name || '',
          amount: payingBudget
            ? (payingBudget.remaining > 0 ? payingBudget.remaining : payingBudget.amount)
            : undefined,
          category: payingBudget?.category_id || undefined,
        }}
        initialBudgetId={payingBudget?.id ?? null}
      />

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} source="budget_limit" />
    </div>
  );
}
