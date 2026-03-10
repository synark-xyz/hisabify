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
}

export function AddTransactionModal({
  open,
  onOpenChange,
  onSuccess,
  initialType,
  initialData
}: AddTransactionModalProps) {
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="New Transaction"
      className="max-h-[90vh]"
    >
      {/* Pass initialData to pre-fill the form */}
      <TransactionForm
        mode="create"
        onSuccess={() => {
          onSuccess();
          onOpenChange(false);
        }}
        onCancel={() => onOpenChange(false)}
        initialType={initialType}
        initialData={initialData}
      />
    </ResponsiveDrawer>
  );
}
