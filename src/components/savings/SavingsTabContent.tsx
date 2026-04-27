import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, HandCoins, Sparkles, ChevronRight } from "lucide-react";
import { useSavingsGoals, SavingsGoalWithProgress } from "@/hooks/useSavingsGoals";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/UpgradeModal";
import {
  SavingsGoalCard,
  AddSavingsGoalModal,
  SavingsGoalsSummary,
} from "@/components/savings";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBudgetContext } from '@/hooks/useBudgetContext';
import { useSearchParams } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

export function SavingsTabContent() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoalWithProgress | null>(null);
  const [mainBalance, setMainBalance] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();

  const {
    goals,
    isLoading,
    createGoal,
    updateGoal,
    addToGoal,
    archiveGoal,
    redeployToBalance,
    redeployToGoal,
    transferBudgetLeftover,
    deleteGoal,
    totalSaved,
    totalTarget,
    completedGoals,
    activeGoals,
    refetch,
  } = useSavingsGoals();

  const { isPremium } = useSubscription();
  const { variant } = useTheme();
  const { user } = useAuth();
  const { budgets } = useBudgetContext();

  const fetchMainBalance = useCallback(async () => {
    if (!user?.id) {
      setMainBalance(0);
      return;
    }

    const { data } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', user.id);

    if (!data) {
      setMainBalance(0);
      return;
    }

    const balance = data.reduce((sum, tx) => (
      tx.type === 'income' ? sum + Number(tx.amount) : sum - Number(tx.amount)
    ), 0);
    setMainBalance(balance);
  }, [user?.id]);

  useEffect(() => {
    void fetchMainBalance();
  }, [fetchMainBalance]);

  const handleAddGoal = () => {
    if (!isPremium && activeGoals.length >= 1) {
      setShowUpgradeModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  const handleSubmit = async (data: {
    name: string;
    target_amount: number;
    current_amount: number;
    deadline?: Date;
    color: string;
    linked_budget_id?: string;
    reserve_amount: number;
    auto_contribute_enabled: boolean;
    auto_contribute_amount: number | null;
    auto_contribute_frequency: 'weekly' | 'monthly' | null;
    plan_frequency: 'daily' | 'weekly' | 'monthly' | null;
    auto_remind: boolean;
  }) => {
    const goalData = {
      name: data.name,
      target_amount: data.target_amount,
      initial_amount: data.current_amount,
      deadline: data.deadline ? format(data.deadline, "yyyy-MM-dd") : null,
      color: data.color,
      icon: "target",
      linked_budget_id: data.linked_budget_id ?? null,
      reserve_amount: data.reserve_amount,
      auto_contribute_enabled: isPremium ? data.auto_contribute_enabled : false,
      auto_contribute_amount: isPremium ? data.auto_contribute_amount : null,
      auto_contribute_frequency: isPremium ? data.auto_contribute_frequency : null,
      plan_frequency: data.plan_frequency,
      plan_start_date: data.plan_frequency
        ? (editingGoal?.plan_start_date || editingGoal?.created_at || new Date().toISOString())
        : null,
      auto_remind: data.plan_frequency ? data.auto_remind : false,
    };

    try {
      if (editingGoal) {
        await updateGoal.mutateAsync({ id: editingGoal.id, ...goalData });
      } else {
        await createGoal.mutateAsync(goalData);
      }
      // Force refetch to ensure UI updates instantly
      refetch();
      setEditingGoal(null);
      setShowAddModal(false); // Close modal here if not closed by component prop
    } catch (error) {
      console.error("Error saving goal:", error);
    }
  };

  const handleEdit = (goal: SavingsGoalWithProgress) => {
    setEditingGoal(goal);
    setShowAddModal(true);
  };

  const handleAddFunds = (id: string, amount: number) => {
    addToGoal.mutate({ id, amount });
  };

  const pendingGoalId = searchParams.get('goal');
  const pendingTab = (searchParams.get('tab') as 'manual' | 'budget' | null) || 'manual';
  const pendingBudgetId = searchParams.get('budget');

  useEffect(() => {
    if (pendingGoalId && goals.some((goal) => goal.id === pendingGoalId)) {
      setSearchParams({}, { replace: true });
    }
  }, [goals, pendingGoalId, setSearchParams]);

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
    <>
      <div className="px-4 pb-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Total Net Savings Sticky Header - Web/Tablet only */}
              <motion.div 
                variants={itemVariants} 
                className="hidden md:block sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-border/50"
              >
                <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-accent/10 to-primary/10 p-4">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t('savings.totalNetSavings')}
                    </p>
                    <p className="text-[24px] font-bold text-foreground">
                      {formatAmount(totalSaved)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t('savings.activeGoals')}
                    </p>
                    <p className="text-[24px] font-bold text-foreground">
                      {activeGoals.length}
                    </p>
                  </div>
                </div>
              </motion.div>

              {variant !== 'premium' && (
                <motion.div
                  variants={itemVariants}
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{t('savings.unlimitedGoals')}</p>
                      <p className="text-xs text-muted-foreground">{t('savings.upgradeForMoreGoals')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              )}

              <motion.div variants={itemVariants} className="flex items-center justify-between pt-2">
                <h2 className="text-lg font-semibold">{t("savings.myGoals")}</h2>
                {!isPremium && activeGoals.length >= 1 && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {t('savings.freeLimit')}
                  </span>
                )}
              </motion.div>

              {goals.length === 0 ? (
                <motion.div variants={itemVariants} className="text-center py-12 bg-card rounded-3xl border border-dashed border-muted">
                  <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <HandCoins className="h-10 w-10 text-accent" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">{t('savings.noGoals')}</h2>
                  <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
                    {t('savings.startBuilding')}
                  </p>
                  <Button onClick={handleAddGoal} className="rounded-full px-6">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('savings.createFirstGoal')}
                  </Button>
                </motion.div>
              ) : (
                <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
                  {goals.map((goal) => (
                    <SavingsGoalCard
                      key={goal.id}
                      goal={goal}
                      mainBalance={mainBalance}
                      otherActiveGoals={goals.filter((entry) => entry.id !== goal.id && !entry.isArchived)}
                      linkedBudgetName={
                        goal.linked_budget_id
                          ? (budgets.find((b) => b.id === goal.linked_budget_id)?.category?.name
                            || budgets.find((b) => b.id === goal.linked_budget_id)?.name)
                          : undefined
                      }
                      onEdit={handleEdit}
                      onDelete={(id) => deleteGoal.mutate(id)}
                      onAddFunds={handleAddFunds}
                      onArchive={(id) => archiveGoal.mutate(id)}
                      onRedeployToBalance={(id, amount) => redeployToBalance.mutate({ id, amount })}
                      onRedeployToGoal={(sourceGoalId, destinationGoalId, amount) => redeployToGoal.mutate({ sourceGoalId, destinationGoalId, amount })}
                      onUpdateDeadline={(goalId, deadline) => updateGoal.mutate({ id: goalId, deadline: format(new Date(deadline), "yyyy-MM-dd") })}
                      onBudgetTransfer={(budgetId, goalId, amount) => {
                        const budget = budgets.find((entry) => entry.id === budgetId);
                        transferBudgetLeftover.mutate({
                          budgetId,
                          budgetName: budget?.category?.name || budget?.name || t('budget.budget'),
                          budgetCategoryId: budget?.category_id || null,
                          goalId,
                          amount,
                        });
                        setSearchParams({});
                      }}
                      defaultFundingTab={pendingGoalId === goal.id ? pendingTab : 'manual'}
                      defaultBudgetId={pendingGoalId === goal.id ? pendingBudgetId : null}
                      autoOpenFunding={pendingGoalId === goal.id}
                    />
                  ))}
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* FAB - New Goal Button - Mobile only */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleAddGoal}
        className="fixed bottom-6 right-6 md:hidden z-50 w-14 h-14 rounded-full bg-accent shadow-lg shadow-accent/30 flex items-center justify-center text-white"
        aria-label={t('savings.newGoal')}
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <AddSavingsGoalModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setEditingGoal(null);
        }}
        onSubmit={handleSubmit}
        editingGoal={editingGoal}
      />

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} source="savings_goals_limit" />
    </>
  );
}
