import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center font-bold text-xl">
            New Transaction
          </DrawerTitle>
        </DrawerHeader>

        {/* Pass initialData to pre-fill the form */}
        <TransactionForm
          onSuccess={() => {
            onSuccess();
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
          initialType={initialType}
          initialData={initialData}
        />
      </DrawerContent>
    </Drawer>
  );
}
