import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, PiggyBank } from "lucide-react";
import { useSavingsGoals, SavingsGoalWithProgress } from "@/hooks/useSavingsGoals";
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
import { format } from "date-fns";

export default function SavingsPage() {
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoalWithProgress | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
  } = useSavingsGoals();

  const handleSubmit = (data: {
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

    if (editingGoal) {
      updateGoal.mutate({ id: editingGoal.id, ...goalData });
    } else {
      createGoal.mutate(goalData);
    }
    setEditingGoal(null);
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 pb-24 space-y-6">
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
    <div className="container mx-auto p-4 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Savings Goals</h1>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>

      <SavingsGoalsSummary
        totalSaved={totalSaved}
        totalTarget={totalTarget}
        goalsCount={goals.length}
        completedGoals={completedGoals}
      />

      {goals.length === 0 ? (
        <div className="text-center py-12">
          <PiggyBank className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No savings goals yet</h2>
          <p className="text-muted-foreground mb-4">
            Start building your future by creating your first savings goal
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Goal
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <SavingsGoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddFunds={handleAddFunds}
            />
          ))}
        </div>
      )}

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

      <BottomNavigation onAddClick={() => setShowAddTransaction(true)} />
      
      <AddTransactionModal
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        onSuccess={() => {}}
      />
    </div>
  );
}
