import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle>{t('dialogs.budgetExceed.title')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('dialogs.budgetExceed.expenseWillExceed', { name: budgetName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('dialogs.budgetExceed.expenseAmount')}</span>
            <span className="font-medium">${amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('dialogs.budgetExceed.budgetRemaining')}</span>
            <span className="font-medium">${remaining.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-gray-600 dark:text-gray-400">{t('dialogs.budgetExceed.overBudgetBy')}</span>
            <span className="font-semibold text-red-600 dark:text-red-400">${excess.toFixed(2)}</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
          >
            {t('dialogs.budgetExceed.addAnyway')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
