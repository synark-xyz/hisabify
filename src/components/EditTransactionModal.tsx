import { BaseModalSheet, SheetBackdrop, SheetContainer, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/base-modal-sheet';
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
    <BaseModalSheet open={open} onOpenChange={onOpenChange}>
      <SheetBackdrop onClick={() => onOpenChange(false)} />
      <SheetContainer>
        <SheetHeader>
          <SheetTitle>Edit {titleByType[transaction.type]}</SheetTitle>
          <SheetClose />
        </SheetHeader>
        <SheetContent>
          <div className="px-4 pb-4">
            <TransactionForm
            mode="edit"
            initialTransaction={transaction}
            onSuccess={() => {
              onSuccess();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
          </div>
        </SheetContent>
      </SheetContainer>
    </BaseModalSheet>
  );
}
