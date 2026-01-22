import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useBudgets, BudgetWithSpending, Budget } from '@/hooks/useBudgets';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { BudgetProgressCard } from '@/components/BudgetProgressCard';
import { BudgetHistoryChart } from '@/components/BudgetHistoryChart';
import { PremiumGuard } from '@/components/PremiumGuard';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useSubscription } from '@/hooks/useSubscription';
import { AddBudgetModal } from '@/components/AddBudgetModal';
import { DeleteBudgetDialog } from '@/components/DeleteBudgetDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function BudgetDashboard() {
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<BudgetWithSpending | null>(null);

  const { budgets, loading, deleteBudget, copyBudgetToNextPeriod } = useBudgets();
  const { currency } = useCurrency();
  const currencySymbol = currencyData[currency]?.symbol || '$';
  const { isPremium } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  const handleCopyToNext = async (budgetId: string) => {
    if (!isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    await copyBudgetToNextPeriod(budgetId);
  };

  const closeAddModal = () => {
    setShowAddBudget(false);
    setEditingBudget(null);
  };


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
                  <p className="text-xs sm:text-sm text-muted-foreground">Budget</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground truncate">
                    {currencySymbol}{totalBudget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                  <p className="text-xs sm:text-sm text-muted-foreground">Spent</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground truncate">
                    {currencySymbol}{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {overallPercentage.toFixed(0)}% used
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
                  <p className="text-xs sm:text-sm text-muted-foreground">Left</p>
                  <p className={cn(
                    "text-lg sm:text-2xl font-bold truncate",
                    totalRemaining >= 0 ? "text-green-500" : "text-destructive"
                  )}>
                    {totalRemaining >= 0 ? '' : '-'}{currencySymbol}{Math.abs(totalRemaining).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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

      {/* Add Budget Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Active Budgets</h2>
        <Button
          onClick={() => {
            if (!isPremium && budgets.length >= 3) {
              setShowUpgradeModal(true);
            } else {
              setShowAddBudget(true);
            }
          }}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {/* Budget Cards */}
      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget) => (
            <BudgetProgressCard
              key={budget.id}
              budget={budget}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCopyToNext={handleCopyToNext}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Budgets Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first budget to start tracking your spending.
            </p>
            <Button onClick={() => setShowAddBudget(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Historical Chart */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Budget vs Spending History</h2>
        <PremiumGuard featureName="Budget History">
          <BudgetHistoryChart />
        </PremiumGuard>
      </div>

      {/* Modals */}
      <AddBudgetModal
        open={showAddBudget}
        onOpenChange={closeAddModal}
        editingBudget={editingBudget}
      />

      <DeleteBudgetDialog
        budget={deletingBudget}
        open={!!deletingBudget}
        onOpenChange={(open) => !open && setDeletingBudget(null)}
        onConfirm={confirmDelete}
      />

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </div>
  );
}
