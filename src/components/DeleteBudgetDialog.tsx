import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BudgetWithSpending } from '@/hooks/useBudgets';

interface DeleteBudgetDialogProps {
  budget: BudgetWithSpending | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const DeleteBudgetDialog = React.forwardRef<HTMLDivElement, DeleteBudgetDialogProps>(
  ({ budget, open, onOpenChange, onConfirm }, ref) => {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent ref={ref}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              {budget ? (
                <>
                  Are you sure you want to delete the budget for{' '}
                  <span className="font-medium text-foreground">
                    {budget.category?.name || budget.name || 'Total Budget'}
                  </span>
                  ? This action cannot be undone.
                </>
              ) : (
                'Are you sure you want to delete this budget? This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

DeleteBudgetDialog.displayName = 'DeleteBudgetDialog';

export { DeleteBudgetDialog };
