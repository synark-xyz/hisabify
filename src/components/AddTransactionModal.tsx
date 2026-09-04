import { useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BaseModalSheet, SheetBackdrop, SheetContainer, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/base-modal-sheet';
import { TransactionForm } from '@/components/TransactionForm';
import { VoiceInputFlow } from '@/components/VoiceInputFlow';
import { useCurrency } from '@/hooks/useCurrency';
import type { ScannedReceiptData } from '@/components/ReceiptScannerModal';

const ReceiptScannerModal = lazy(() => import('@/components/ReceiptScannerModal').then(m => ({ default: m.ReceiptScannerModal })));

interface TransactionFormState {
  type: 'expense' | 'income' | 'transfer';
  merchant: string;
  amount: string;
  categoryId: string;
  date: Date;
  note: string;
  currency: string;
  payer: string;
  payee: string;
  splitWith: string;
  selectedTags: string[];
  transactionStatus: 'cleared' | 'uncleared';
  isSplit: boolean;
  splitRows: Array<{ id: string; categoryId: string; amount: string }>;
  paymentMethod: string;
  transferFromAccountTypeId: string;
  transferToAccountTypeId: string;
  transferFee: string;
  customCategoryLabel: string;
  selectedParentCategoryId: string;
}

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialType?: 'expense' | 'income' | 'transfer';
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

const getInitialFormState = (props: {
  initialType?: 'expense' | 'income' | 'transfer';
  initialData?: {
    merchant?: string;
    amount?: number;
    category?: string;
    receiptUrl?: string | null;
    date?: Date;
    currency?: string;
  };
  defaultCurrency?: string;
}): TransactionFormState => ({
  type: props.initialType || 'expense',
  merchant: props.initialData?.merchant || '',
  amount: props.initialData?.amount ? String(props.initialData.amount) : '',
  categoryId: props.initialData?.category || '',
  date: props.initialData?.date || new Date(),
  note: '',
  currency: props.initialData?.currency || props.defaultCurrency || 'USD',
  payer: '',
  payee: '',
  splitWith: '',
  selectedTags: [],
  transactionStatus: 'cleared',
  isSplit: false,
  splitRows: [],
  paymentMethod: '',
  transferFromAccountTypeId: '',
  transferToAccountTypeId: '',
  transferFee: '',
  customCategoryLabel: '',
  selectedParentCategoryId: '',
});

export function AddTransactionModal({
  open,
  onOpenChange,
  onSuccess,
  initialType,
  initialData,
  initialBudgetId,
}: AddTransactionModalProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currency: defaultCurrency } = useCurrency();
  const [showVoice, setShowVoice] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [prefillData, setPrefillData] = useState<Record<string, unknown>>(initialData ?? {});
  const [prefillKey, setPrefillKey] = useState(0);
  const [formState, setFormState] = useState<TransactionFormState>(getInitialFormState({
    initialType,
    initialData,
    defaultCurrency,
  }));
  const [hasPendingFormState, setHasPendingFormState] = useState(false);

  const handleVoiceComplete = (data: { merchant?: string; amount?: number; currency?: string; type?: string }) => {
    const extractedCurrency = data.currency || defaultCurrency;
    setPrefillData({ merchant: data.merchant, amount: data.amount, currency: extractedCurrency });
    if (hasPendingFormState) {
      setFormState(prev => ({ ...prev, currency: extractedCurrency }));
    }
    setPrefillKey((k) => k + 1);
    setShowVoice(false);
  };

  const handleReceiptComplete = (data: ScannedReceiptData) => {
    const extractedCurrency = data.currency || defaultCurrency;
    setPrefillData({
      merchant: data.merchant,
      amount: data.amount,
      date: data.date,
      receiptUrl: data.receiptUrl ?? null,
      currency: extractedCurrency,
    });
    if (hasPendingFormState) {
      setFormState(prev => ({ ...prev, currency: extractedCurrency }));
    }
    setPrefillKey((k) => k + 1);
    setShowReceipt(false);
  };

  const handleNavigateToCategories = useCallback((currentFormState: TransactionFormState) => {
    setFormState(currentFormState);
    setHasPendingFormState(true);
    onOpenChange(false);
    navigate('/categories');
  }, [navigate, onOpenChange]);

  const effectiveFormState = hasPendingFormState ? formState : getInitialFormState({
    initialType,
    initialData,
    defaultCurrency,
  });

  return (
    <>
      <BaseModalSheet open={open} onOpenChange={onOpenChange} snapPoints={[1, 0.6]}>
        <SheetBackdrop onClick={() => onOpenChange(false)} />
        <SheetContainer>
          <SheetHeader>
            <SheetTitle>{t('common.newTransaction')}</SheetTitle>
            <SheetClose />
          </SheetHeader>
          <SheetContent>
            <div className="px-4 pb-4 pt-4">
              <TransactionForm
              key={prefillKey}
              mode="create"
              onSuccess={() => {
                setHasPendingFormState(false);
                onSuccess();
                onOpenChange(false);
              }}
              onSuccessKeepOpen={() => {
                setHasPendingFormState(false);
                onSuccess();
              }}
              onCancel={() => {
                setHasPendingFormState(false);
                onOpenChange(false);
              }}
              initialType={effectiveFormState.type}
              initialData={{
                merchant: effectiveFormState.merchant || prefillData.merchant as string || undefined,
                amount: effectiveFormState.amount ? Number(effectiveFormState.amount) : (prefillData.amount as number | undefined),
                category: effectiveFormState.categoryId || prefillData.category as string || undefined,
                // A scanned receipt date must win over the form's default of `new Date()`,
                // otherwise every scan silently files the transaction under today.
                date: (prefillData.date as Date | undefined)
                  ?? (effectiveFormState.date instanceof Date ? effectiveFormState.date : new Date(effectiveFormState.date)),
                currency: prefillData.currency as string || effectiveFormState.currency || undefined,
                // TransactionForm writes this straight to transactions.receipt_url. Dropping it
                // here is what made scanned receipts save with no image attached.
                receiptUrl: (prefillData.receiptUrl as string | null | undefined) ?? undefined,
              }}
              initialBudgetId={initialBudgetId}
              onVoiceRequest={() => setShowVoice(true)}
              onScanRequest={() => setShowReceipt(true)}
              onNavigateToCategories={handleNavigateToCategories}
              formState={effectiveFormState}
              setFormState={setFormState}
            />
            </div>
          </SheetContent>
        </SheetContainer>
      </BaseModalSheet>

      <VoiceInputFlow
        open={showVoice}
        onOpenChange={setShowVoice}
        onComplete={handleVoiceComplete}
      />
      <Suspense fallback={null}>
        <ReceiptScannerModal
          open={showReceipt}
          onOpenChange={setShowReceipt}
          onScanComplete={handleReceiptComplete}
        />
      </Suspense>


    </>
  );
}
