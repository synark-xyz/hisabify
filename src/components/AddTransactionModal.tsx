import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { TransactionForm } from '@/components/TransactionForm';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialType?: 'expense' | 'income' | 'lend' | 'owe';
  initialData?: {
    merchant?: string;
    amount?: number;
    category?: string;
  };
  initialBudgetId?: string | null;
}

export function AddTransactionModal({
  open,
  onOpenChange,
  onSuccess,
  initialType,
  initialData,
  initialBudgetId,
}: AddTransactionModalProps) {
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="New Transaction"
      className="max-h-[90vh]"
    >
      <TransactionForm
        mode="create"
        onSuccess={() => {
          onSuccess();
          onOpenChange(false);
        }}
        onSuccessKeepOpen={() => onSuccess()}
        onCancel={() => onOpenChange(false)}
        initialType={initialType}
        initialData={initialData}
        initialBudgetId={initialBudgetId}
      />
    </ResponsiveDrawer>
  );
}
