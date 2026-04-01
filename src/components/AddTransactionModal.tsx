import { useState } from 'react';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { TransactionForm } from '@/components/TransactionForm';
import { VoiceInputFlow } from '@/components/VoiceInputFlow';
import { ReceiptScannerModal, ScannedReceiptData } from '@/components/ReceiptScannerModal';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialType?: 'expense' | 'income' | 'lend' | 'owe' | 'transfer';
  initialData?: {
    merchant?: string;
    amount?: number;
    category?: string;
    receiptUrl?: string | null;
    date?: Date;
    currency?: string;
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
  const [showVoice, setShowVoice] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [prefillData, setPrefillData] = useState<Record<string, unknown>>(initialData ?? {});
  const [prefillKey, setPrefillKey] = useState(0);

  const handleVoiceComplete = (data: { merchant?: string; amount?: number; currency?: string; type?: string }) => {
    setPrefillData({ merchant: data.merchant, amount: data.amount, currency: data.currency });
    setPrefillKey((k) => k + 1);
    setShowVoice(false);
  };

  const handleReceiptComplete = (data: ScannedReceiptData) => {
    setPrefillData({
      merchant: data.merchant,
      amount: data.amount,
      date: data.date,
      receiptUrl: data.receiptUrl ?? null,
      currency: data.currency,
    });
    setPrefillKey((k) => k + 1);
    setShowReceipt(false);
  };

  return (
    <>
      <ResponsiveDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="New Transaction"
        className="max-h-[90vh]"
      >
        <TransactionForm
          key={prefillKey}
          mode="create"
          onSuccess={() => {
            onSuccess();
            onOpenChange(false);
          }}
          onSuccessKeepOpen={() => onSuccess()}
          onCancel={() => onOpenChange(false)}
          initialType={initialType}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialData={prefillData as any}
          initialBudgetId={initialBudgetId}
          onVoiceRequest={() => setShowVoice(true)}
          onScanRequest={() => setShowReceipt(true)}
        />
      </ResponsiveDrawer>

      <VoiceInputFlow
        open={showVoice}
        onOpenChange={setShowVoice}
        onComplete={handleVoiceComplete}
      />
      <ReceiptScannerModal
        open={showReceipt}
        onOpenChange={setShowReceipt}
        onScanComplete={handleReceiptComplete}
      />
    </>
  );
}
