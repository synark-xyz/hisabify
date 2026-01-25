import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import { AddPaymentReminderModal } from "@/components/AddPaymentReminderModal";
import { format } from "date-fns";
import { Header } from "@/components/Header";
import { PullToRefresh } from '@/components/PullToRefresh';

export default function SavingsPage() {
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income' | 'lend' | 'owe' | undefined>(undefined);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoalWithProgress | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { isPremium } = useSubscription();

  const {
    goals,
    isLoading,
    createGoal,
    updateGoal,
    addToGoal,
    deleteGoal,
    totalSaved,
    totalTarget,
    completedGoals,
    refetch,
  } = useSavingsGoals();

  const handleAddGoal = () => {
    if (!isPremium && goals.length >= 1) {
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
  }) => {
    const goalData = {
      name: data.name,
      target_amount: data.target_amount,
      current_amount: data.current_amount,
      deadline: data.deadline ? format(data.deadline, "yyyy-MM-dd") : null,
      color: data.color,
      icon: "piggy-bank",
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

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteGoal.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleAddFunds = (id: string, amount: number) => {
    addToGoal.mutate({ id, amount });
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

  if (isLoading) {
    return (
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 pb-24 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PullToRefresh onRefresh={async () => { await refetch(); }} className="h-[100dvh] pb-page-content fade-bottom-overlay">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto safe-top pt-4">
          <Header title="Savings" />

          <motion.main
            className="px-4 space-y-6 mt-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Hero Section */}
            <motion.div
              variants={itemVariants}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 shadow-xl"
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-white/80" />
                    <span className="text-white/80 text-sm font-medium">Goal Tracking</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-1">Your Savings</h1>
                  <p className="text-white/70 text-sm">Build your wealth, one goal at a time</p>
                </div>
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  whileHover={{ scale: 1.05, rotate: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <HandCoins className="w-8 h-8 text-white" />
                </motion.div>
              </div>
            </motion.div>

            {/* Stats Summary */}
            <motion.div variants={itemVariants}>
              <SavingsGoalsSummary
                totalSaved={totalSaved}
                totalTarget={totalTarget}
                goalsCount={goals.length}
                completedGoals={completedGoals}
              />
            </motion.div>

            {!isPremium && (
              <motion.div
                variants={itemVariants}
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-purple-600/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Unlimited Savings Goals</p>
                    <p className="text-xs text-muted-foreground">Upgrade to Pro to create more than one goal</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            )}

            <motion.div variants={itemVariants} className="flex items-center justify-between pt-2">
              <h2 className="text-lg font-semibold">My Goals</h2>
              <Button onClick={handleAddGoal} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Goal
              </Button>
            </motion.div>

            {goals.length === 0 ? (
              <motion.div variants={itemVariants} className="text-center py-12 bg-card rounded-3xl border border-dashed border-muted">
                <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <HandCoins className="h-10 w-10 text-accent" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No savings goals yet</h2>
                <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
                  Start building your future by creating your first savings goal today.
                </p>
                <Button onClick={handleAddGoal} className="rounded-full px-6">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Goal
                </Button>
              </motion.div>
            ) : (
              <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {goals.map((goal) => (
                  <SavingsGoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAddFunds={handleAddFunds}
                  />
                ))}
              </motion.div>
            )}
          </motion.main>
        </div>
      </PullToRefresh>

      <AddSavingsGoalModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setEditingGoal(null);
        }}
        onSubmit={handleSubmit}
        editingGoal={editingGoal}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Savings Goal?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              savings goal and all its progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />

      <BottomNavigation
        onAddTransaction={() => setShowAddTransaction(true)}
      />

      <AddTransactionModal
        open={showAddTransaction}
        onOpenChange={(open) => {
          setShowAddTransaction(open);
          if (!open) setTransactionType(undefined);
        }}
        onSuccess={() => { }}
        initialType={transactionType}
      />

      <AddPaymentReminderModal
        open={showAddReminder}
        onOpenChange={setShowAddReminder}
        onSuccess={() => { }}
      />
    </div>
  );
}
