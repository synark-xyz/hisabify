import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { TransactionForm } from '@/components/TransactionForm';
import { VoiceInputFlow } from '@/components/VoiceInputFlow';
import { ReceiptScannerModal, ScannedReceiptData } from '@/components/ReceiptScannerModal';
import { useCurrency } from '@/hooks/useCurrency';

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
    // Also update formState currency if user has pending state
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
    // Also update formState currency if user has pending state
    if (hasPendingFormState) {
      setFormState(prev => ({ ...prev, currency: extractedCurrency }));
    }
    setPrefillKey((k) => k + 1);
    setShowReceipt(false);
  };

  // Handle navigating to categories page while preserving form state
  const handleNavigateToCategories = useCallback((currentFormState: TransactionFormState) => {
    // Save the current form state
    setFormState(currentFormState);
    setHasPendingFormState(true);
    // Close the modal
    onOpenChange(false);
    // Navigate to categories page
    navigate('/categories');
  }, [navigate, onOpenChange]);

  // When modal opens and there's pending form state, restore it
  const effectiveFormState = hasPendingFormState ? formState : getInitialFormState({
    initialType,
    initialData,
    defaultCurrency,
  });

  return (
    <>
      <ResponsiveDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={t('common.newTransaction')}
        className="max-h-[90vh]"
      >
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
            date: effectiveFormState.date instanceof Date ? effectiveFormState.date : new Date(effectiveFormState.date),
            currency: prefillData.currency as string || effectiveFormState.currency || undefined,
          }}
          initialBudgetId={initialBudgetId}
          onVoiceRequest={() => setShowVoice(true)}
          onScanRequest={() => setShowReceipt(true)}
          onNavigateToCategories={handleNavigateToCategories}
          formState={effectiveFormState}
          setFormState={setFormState}
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
