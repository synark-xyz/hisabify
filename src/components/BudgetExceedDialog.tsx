import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface BudgetExceedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetName: string;
  amount: number;
  remaining: number;
  excess: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BudgetExceedDialog({
  open,
  onOpenChange,
  budgetName,
  amount,
  remaining,
  excess,
  onConfirm,
  onCancel,
}: BudgetExceedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle>Budget Limit Exceeded</DialogTitle>
          </div>
          <DialogDescription>
            This expense will exceed your <strong>{budgetName}</strong> budget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Expense amount:</span>
            <span className="font-medium">${amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Budget remaining:</span>
            <span className="font-medium">${remaining.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-gray-600 dark:text-gray-400">Over budget by:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">${excess.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
          >
            Add Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
