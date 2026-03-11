import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { TransactionForm } from '@/components/TransactionForm';
import { Transaction } from '@/types';

interface EditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSuccess: () => void;
}

const titleByType: Record<'expense' | 'income' | 'lend' | 'owe', string> = {
  expense: 'Expense',
  income: 'Income',
  lend: 'Lend',
  owe: 'Owe',
};

export function EditTransactionModal({ open, onOpenChange, transaction, onSuccess }: EditTransactionModalProps) {
  if (!transaction) {
    return null;
  }

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${titleByType[transaction.type]}`}
      className="max-h-[90vh]"
    >
      <TransactionForm
        mode="edit"
        initialTransaction={transaction}
        onSuccess={() => {
          onSuccess();
          onOpenChange(false);
        }}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveDrawer>
  );
}
