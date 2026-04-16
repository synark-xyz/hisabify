import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { BudgetWithSpending } from '@/hooks/useBudgets';
import { useTranslation } from 'react-i18next';

interface DeleteBudgetDialogProps {
  budget: BudgetWithSpending | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const DeleteBudgetDialog = React.forwardRef<HTMLDivElement, DeleteBudgetDialogProps>(
  ({ budget, open, onOpenChange, onConfirm }, ref) => {
    const { t } = useTranslation();
    const handleConfirm = () => {
      onConfirm();
      onOpenChange(false);
    };
    const budgetName = budget?.category?.name || budget?.name || t('budget.totalBudget');

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl z-[10000]" ref={ref}>
          <SheetHeader className="text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <SheetTitle className="text-xl">{t('dialogs.deleteBudget.title')}</SheetTitle>
            </div>
            <SheetDescription className="text-base leading-relaxed pt-2">
              {budget ? (
                <>
                  {t('dialogs.deleteBudget.confirmTitle', { name: budgetName })} {t('dialogs.deleteBudget.confirmDesc')}
                </>
              ) : (
                t('dialogs.deleteBudget.confirmDesc')
              )}
            </SheetDescription>
          </SheetHeader>

          <SheetFooter className="flex-col sm:flex-col gap-2 pt-6 pb-2">
            <Button
              onClick={handleConfirm}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              size="lg"
            >
              {t('dialogs.deleteBudget.title')}
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {t('common.cancel')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }
);

DeleteBudgetDialog.displayName = 'DeleteBudgetDialog';

export { DeleteBudgetDialog };
