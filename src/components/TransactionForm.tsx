import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFormatDate } from '@/lib/formatDate';
import { getLocalizedCategoryName } from '@/lib/utils';
import { Loader2, Calendar, ArrowUpRight, ArrowDownLeft, Handshake, Landmark, Plus, X, Split, Bell, CalendarIcon, Mic, Camera, Info, ArrowLeftRight, Banknote, CreditCard, Building2, Globe, FileText, Clock } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { toastInfo } from '@/lib/toast';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useSubscription } from '@/hooks/useSubscription';
import { useCategories } from '@/hooks/useCategories';
import { useBudgetContext } from '@/hooks/useBudgetContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useSmartSuggest } from '@/hooks/useSmartSuggest';
import { useCategoryMutations } from '@/hooks/useCategoryMutations';
import { SuggestionBanner } from '@/components/SuggestionBanner';
import { Transaction, Card as CardType, PaymentMethod, PAYMENT_METHOD_LABELS, AccountType } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { PREDEFINED_TAGS } from '@/lib/transactionConstants';

interface TransactionFormState {
  type: 'expense' | 'income' | 'lend' | 'owe' | 'transfer';
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

interface TransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  onSuccessKeepOpen?: () => void;
  mode?: 'create' | 'edit';
  initialTransaction?: Transaction | null;
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
  onVoiceRequest?: () => void;
  onScanRequest?: () => void;
  onNavigateToCategories?: (formState: TransactionFormState) => void;
  formState?: TransactionFormState;
  setFormState?: React.Dispatch<React.SetStateAction<TransactionFormState>>;
}

interface TransactionFormValues {
  merchant: string;
  amount: string;
  categoryId: string;
  date: Date;
  note: string;
  currency: string;
}

interface SplitRow {
  id: string;
  categoryId: string;
  amount: string;
}


function stripLegacyNoteTag(note: string | null): string {
  const raw = (note || '').trim();
  return raw.replace(/^\[(credit_card|utility|lend|owe|custom)\]\s*/i, '').trim();
}

function parseNoteMeta(note: string | null): {
  payer: string; payee: string; splitWith: string; cleanNote: string;
} {
  let remaining = stripLegacyNoteTag(note);
  let payer = '';
  let payee = '';
  let splitWith = '';

  const payerMatch = remaining.match(/^\[payer:([^\]]*)\]\s*/);
  if (payerMatch) { payer = payerMatch[1]; remaining = remaining.slice(payerMatch[0].length); }

  const payeeMatch = remaining.match(/^\[payee:([^\]]*)\]\s*/);
  if (payeeMatch) { payee = payeeMatch[1]; remaining = remaining.slice(payeeMatch[0].length); }

  const splitMatch = remaining.match(/^\[split_with:([^\]]*)\]\s*/);
  if (splitMatch) { splitWith = splitMatch[1]; remaining = remaining.slice(splitMatch[0].length); }

  return { payer, payee, splitWith, cleanNote: remaining };
}

export function TransactionForm({
  onSuccess,
  onCancel,
  onSuccessKeepOpen,
  mode = 'create',
  initialTransaction,
  initialType,
  initialData,
  initialBudgetId,
  onVoiceRequest,
  onScanRequest,
  onNavigateToCategories,
}: TransactionFormProps) {
  const [type, setType] = useState<'expense' | 'income' | 'lend' | 'owe' | 'transfer'>(
    initialType || 'expense'
  );

  /* ─── Phase 2.1: Transfer state ─── */
  const [cards, setCards] = useState<CardType[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [transferFromAccountTypeId, setTransferFromAccountTypeId] = useState<string>('');
  const [transferToAccountTypeId, setTransferToAccountTypeId] = useState<string>('');
  const [transferFee, setTransferFee] = useState<string>('');

  /* ─── Phase 2.3: Payment method state ─── */
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [dateOpen, setDateOpen] = useState(false);
  const [convertedPreview, setConvertedPreview] = useState<{ amount: number; rate: number } | null>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(
    initialBudgetId ?? (initialTransaction?.budget_id ?? null)
  );
  const [customCategoryLabel, setCustomCategoryLabel] = useState('');
  const [customCategoryError, setCustomCategoryError] = useState('');

  /* ─── Feature 1.1: Sub-Categories state ─── */
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string>('');

  /* ─── Feature 1.2: Tags state ─── */
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  /* ─── Feature 1.3: Cleared/Uncleared status state ─── */
  const [transactionStatus, setTransactionStatus] = useState<'cleared' | 'uncleared'>('cleared');

  /* ─── Feature 1.4: Split Transaction state ─── */
  const [isSplit, setIsSplit] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([]);

  /* ─── Payer / Payee / Split With ─── */
  const [payer, setPayer] = useState('');
  const [payee, setPayee] = useState('');
  const [splitWith, setSplitWith] = useState('');

  /* ─── Reminder toggle state ─── */
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [reminderDateOpen, setReminderDateOpen] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<string>('monthly');
  const [recurringOpen, setRecurringOpen] = useState(false);

  /* ─── Feature 2.x: Transfer disabled state (coming soon) ─── */
  const transferDisabled = true;

  /* ─── Feature 1.5: Auto-fill merchant suggestions state ─── */
  const [merchantSuggestions, setMerchantSuggestions] = useState<Array<{ merchant: string; category_id: string | null; type: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const merchantDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const merchantInputRef = useRef<HTMLInputElement | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { currency, formatAmount } = useCurrency();
  const { convertAmount } = useExchangeRate();
  const { isPremium } = useSubscription();
  const { logEvent } = useAnalytics();
  const { categories } = useCategories();
  const { budgets, getBudgetsForCategory } = useBudgetContext();
  const { activeGoals } = useSavingsGoals();
  const { incrementUsageCount } = useCategoryMutations();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { formatDate } = useFormatDate();

  const toLocaleNum = useCallback((n: number) => {
    const locale = i18n.language === 'bn' ? 'bn-BD' : i18n.language === 'ja' ? 'ja-JP' : 'en-US';
    return new Intl.NumberFormat(locale, { useGrouping: false }).format(n);
  }, [i18n.language]);

  const [linkedBudgetId, setLinkedBudgetId] = useState<string | null>(
    initialTransaction?.budget_id ?? null
  );
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(
    initialTransaction?.savings_goal_id ?? null
  );

  const isEditMode = mode === 'edit' && !!initialTransaction;

  /* ─── Phase 2.1: Fetch user account types for transfer ─── */
  useEffect(() => {
    if (!user) {
      console.log('[Transfer] No user, skipping account_types fetch');
      return;
    }
    console.log('[Transfer] Fetching account_types for user:', user.id);
    supabase
      .from('account_types')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('[Transfer] Error fetching account_types:', error);
          return;
        }
        console.log('[Transfer] Account types data:', data);
        if (data && data.length > 0) {
          setAccountTypes(data as AccountType[]);
          const personal = data.find((at) => at.name === 'Personal');
          if (personal) {
            setTransferFromAccountTypeId(personal.id);
            setTransferToAccountTypeId(personal.id);
          }
        }
      });
  }, [user]);

  /* ─── Feature 1.1: Category grouping ─── */
  const rootCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const subCategoriesMap = useMemo(() => {
    const map = new Map<string, typeof categories>();
    for (const cat of categories) {
      if (cat.parent_id) {
        const existing = map.get(cat.parent_id) || [];
        existing.push(cat);
        map.set(cat.parent_id, existing);
      }
    }
    return map;
  }, [categories]);

  const getSubCategories = useCallback(
    (parentId: string) => subCategoriesMap.get(parentId) || [],
    [subCategoriesMap]
  );

  const form = useForm<TransactionFormValues>({
    defaultValues: {
      merchant: initialData?.merchant || '',
      amount: initialData?.amount ? String(initialData.amount) : '',
      categoryId: initialData?.category || '',
      date: initialData?.date || new Date(),
      note: '',
      currency: initialData?.currency || currency,
    },
  });

  // Sync form currency when useCurrency() resolves from DB — skip if scan already detected a currency
  useEffect(() => {
    if (!isEditMode && !initialData?.currency && currency) {
      form.setValue('currency', currency);
    }
  }, [currency, initialData?.currency, isEditMode, form]);

  const watchedAmount = form.watch('amount');
  const watchedCurrency = form.watch('currency');
  const watchedCategoryId = form.watch('categoryId');

  const selectedCategory = categories.find((c) => c.id === watchedCategoryId);
  const isOtherCategory = selectedCategory?.name?.toLowerCase() === 'other' && !selectedCategory?.is_system_category;

  const suggestion = useSmartSuggest(
    type,
    watchedCategoryId,
    budgets,
    activeGoals
  );

  useEffect(() => {
    if (mode === 'create') {
      setLinkedBudgetId(null);
      setSelectedBudgetId(null);
      setLinkedGoalId(null);
    }
  }, [type, watchedCategoryId, mode]);

  const matchingBudgets = useMemo(() => {
    if (type === 'transfer' || (type !== 'expense' && type !== 'lend' && type !== 'owe') || !watchedCategoryId) return [];
    return getBudgetsForCategory(watchedCategoryId);
  }, [type, watchedCategoryId, getBudgetsForCategory]);

  /* ─── Feature 1.4: Split validation ─── */
  const splitTotal = useMemo(() => {
    return splitRows.reduce((sum, row) => {
      const val = Number.parseFloat(row.amount);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
  }, [splitRows]);

  const totalAmount = Number.parseFloat(watchedAmount) || 0;
  const splitDifference = Math.abs(totalAmount - splitTotal);
  const splitIsValid = splitRows.length > 0 && splitDifference < 0.01 && splitRows.every((r) => r.categoryId && Number.parseFloat(r.amount) > 0);

  const resetFormState = useCallback(() => {
    setSelectedTags([]);
    setTransactionStatus('cleared');
    setIsSplit(false);
    setSplitRows([]);
    setSelectedParentCategoryId('');
    setCustomCategoryLabel('');
    setCustomCategoryError('');
    setMerchantSuggestions([]);
    setShowSuggestions(false);
    setReminderEnabled(false);
    setReminderDate(undefined);
    setReminderDateOpen(false);
    setPayer('');
    setPayee('');
    setSplitWith('');
    /* ─── Phase 2.1 / 2.3 reset ─── */
    setTransferFromAccountTypeId('');
    setTransferToAccountTypeId('');
    setTransferFee('');
    setPaymentMethod('');
  }, []);

  const initializeCreateState = useCallback(() => {
    setType(initialType || 'expense');
    form.reset({
      merchant: initialData?.merchant || '',
      amount: initialData?.amount ? String(initialData.amount) : '',
      categoryId: initialData?.category || '',
      date: initialData?.date || new Date(),
      note: '',
      currency: initialData?.currency || currency,
    });
    setSelectedBudgetId(initialBudgetId ?? null);
    setLinkedBudgetId(initialBudgetId ?? null);
    resetFormState();
  }, [currency, form, initialData, initialType, initialBudgetId, resetFormState]);

  const initializeEditState = useCallback(() => {
    if (!initialTransaction) {
      return;
    }

    setType((initialTransaction.type as 'expense' | 'income' | 'lend' | 'owe' | 'transfer') || 'expense');
    const { payer: initPayer, payee: initPayee, splitWith: initSplitWith, cleanNote } = parseNoteMeta(initialTransaction.note);
    form.reset({
      merchant: initialTransaction.merchant,
      amount: String(initialTransaction.amount_original || initialTransaction.amount),
      categoryId: initialTransaction.category_id || '',
      date: new Date(initialTransaction.date),
      note: cleanNote,
      currency: initialTransaction.currency_original || currency,
    });
    setPayer(initPayer);
    setPayee(initPayee);
    setSplitWith(initSplitWith);
    setSelectedBudgetId(initialTransaction.budget_id ?? null);
    setLinkedBudgetId(initialTransaction.budget_id ?? null);
    setCustomCategoryLabel(initialTransaction.custom_category_label || '');
    setCustomCategoryError('');

    /* ─── Feature 1.2: Initialize tags from edit ─── */
    setSelectedTags(initialTransaction.tags ?? []);

    /* ─── Feature 1.3: Initialize status from edit ─── */
    setTransactionStatus(
      (initialTransaction.status as 'cleared' | 'uncleared') ?? 'cleared'
    );

    /* ─── Feature 1.1: Initialize parent category for edit ─── */
    if (initialTransaction.category_id) {
      const cat = categories.find((c) => c.id === initialTransaction.category_id);
      if (cat?.parent_id) {
        setSelectedParentCategoryId(cat.parent_id);
      } else if (cat) {
        setSelectedParentCategoryId(cat.id);
      }
    }

    /* ─── Phase 2.1: Initialize transfer fields ─── */
    if (initialTransaction.type === 'transfer') {
      setTransferFromAccountTypeId(initialTransaction.card_id || '');
      setTransferToAccountTypeId(initialTransaction.transfer_to_card_id || '');
      setTransferFee(initialTransaction.transfer_fee ? String(initialTransaction.transfer_fee) : '');
    }

    /* ─── Phase 2.3: Initialize payment method ─── */
    setPaymentMethod((initialTransaction.payment_method as PaymentMethod) || '');
  }, [currency, form, initialTransaction, categories]);

  useEffect(() => {
    if (isEditMode) {
      initializeEditState();
      return;
    }

    initializeCreateState();
  }, [isEditMode, initializeEditState, initializeCreateState]);

  useEffect(() => {
    const previewConversion = async () => {
      if (!watchedAmount || watchedCurrency === currency) {
        setConvertedPreview(null);
        return;
      }

      const amountNum = Number.parseFloat(watchedAmount);
      if (Number.isNaN(amountNum)) {
        return;
      }

      const result = await convertAmount(amountNum, watchedCurrency, currency);
      if (result) {
        setConvertedPreview({
          amount: result.convertedAmount,
          rate: result.rate,
        });
      }
    };

    const debounce = setTimeout(previewConversion, 500);
    return () => clearTimeout(debounce);
  }, [watchedAmount, watchedCurrency, currency, convertAmount]);

  /* ─── Feature 1.5: Merchant auto-fill effect ─── */
  const watchedMerchant = form.watch('merchant');
  useEffect(() => {
    // Don't show suggestions for lend/owe/transfer types
    if (type === 'lend' || type === 'owe' || type === 'transfer') {
      setMerchantSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (merchantDebounceRef.current) clearTimeout(merchantDebounceRef.current);

    if (!watchedMerchant || watchedMerchant.trim().length < 2 || !user) {
      setMerchantSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    merchantDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('transactions')
          .select('merchant, category_id, type')
          .eq('user_id', user.id)
          .ilike('merchant', `%${watchedMerchant.trim()}%`)
          .order('date', { ascending: false })
          .limit(20);

        if (data && data.length > 0) {
          // Deduplicate by merchant name (keep first = most recent)
          const seen = new Set<string>();
          const deduped: Array<{ merchant: string; category_id: string | null; type: string }> = [];
          for (const row of data) {
            const key = row.merchant.toLowerCase();
            if (!seen.has(key) && deduped.length < 5) {
              seen.add(key);
              deduped.push(row);
            }
          }
          setMerchantSuggestions(deduped);
          setShowSuggestions(deduped.length > 0);
        } else {
          setMerchantSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {
        // Silently fail — auto-fill is a nice-to-have
      }
    }, 300);

    return () => {
      if (merchantDebounceRef.current) clearTimeout(merchantDebounceRef.current);
    };
  }, [watchedMerchant, user, type]);

  const logCustomCategorySuggestion = (label: string) => {
    if (!isOtherCategory || !label.trim() || !user) return;
    // Fire-and-forget: log custom category suggestion
    supabase.rpc('upsert_custom_category_suggestion', {
      p_label: label.trim(),
      p_category_type: type === 'income' ? 'income' : 'expense',
      p_user_id: user.id,
    }).then(({ error }) => {
      // Silently ignore errors - this is analytics, not critical
    });
  };

  /* ─── Feature 1.1: Handle parent category change ─── */
  const handleParentCategoryChange = useCallback(
    (parentId: string) => {
      setSelectedParentCategoryId(parentId);
      const subs = getSubCategories(parentId);
      if (subs.length === 0) {
        // No sub-categories — use parent's id directly
        form.setValue('categoryId', parentId);
      } else {
        // Has sub-categories — clear selection, user must pick one
        form.setValue('categoryId', '');
      }
      setSelectedBudgetId(null);
      setLinkedBudgetId(null);
      setCustomCategoryLabel('');
      setCustomCategoryError('');
    },
    [form, getSubCategories]
  );

  /* ─── Feature 1.2: Toggle tag ─── */
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  /* ─── Feature 1.4: Split row helpers ─── */
  const addSplitRow = useCallback(() => {
    setSplitRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), categoryId: '', amount: '' },
    ]);
  }, []);

  const removeSplitRow = useCallback((id: string) => {
    setSplitRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateSplitRow = useCallback((id: string, field: 'categoryId' | 'amount', value: string) => {
    setSplitRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }, []);

  const initializeSplit = useCallback(() => {
    const currentCategoryId = form.getValues('categoryId');
    const currentAmount = form.getValues('amount');
    setSplitRows([
      {
        id: crypto.randomUUID(),
        categoryId: currentCategoryId || '',
        amount: currentAmount || '',
      },
    ]);
  }, [form]);

  const handleSubmit = async (data: TransactionFormValues, keepOpen = false) => {
    if (!user) {
      return;
    }

    const merchant = data.merchant.trim();
    const amountNum = Number.parseFloat(data.amount);
    const normalizedAmount = Number.isFinite(amountNum) ? Number(amountNum.toFixed(2)) : NaN;
    const hasValidDate = data.date instanceof Date && !Number.isNaN(data.date.getTime());

    if (!merchant && type !== 'transfer') {
      form.setError('merchant', { type: 'manual', message: t('transaction.validationDescription') });
      return;
    }
    // For transfers, default description if blank
    const effectiveMerchant = merchant || 'Account Transfer';

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      form.setError('amount', { type: 'manual', message: 'Amount must be greater than 0.' });
      return;
    }

    if (!hasValidDate) {
      form.setError('date', { type: 'manual', message: t('transaction.validationDate') });
      return;
    }

    /* ─── Phase 2.1: Transfer validation ─── */
    if (type === 'transfer') {
      if (!transferFromAccountTypeId) {
        toast({ title: t('transaction.validationFromAccount'), description: t('transaction.validationFromAccountDesc'), variant: 'destructive' });
        return;
      }
      if (!transferToAccountTypeId) {
        toast({ title: t('transaction.validationToAccount'), description: t('transaction.validationToAccountDesc'), variant: 'destructive' });
        return;
      }
      if (transferFromAccountTypeId === transferToAccountTypeId) {
        toast({ title: t('transaction.validationSameAccount'), description: t('transaction.validationSameAccountDesc'), variant: 'destructive' });
        return;
      }
    }

    /* ─── Feature 1.4: Skip category validation when split ─── */
    if (type === 'expense' && !isSplit && !data.categoryId) {
      form.setError('categoryId', { type: 'manual', message: t('transaction.validationCategory') });
      return;
    }

    if (isOtherCategory && !customCategoryLabel.trim()) {
      setCustomCategoryError(t('transaction.validationCustomCategory'));
      return;
    }

    /* ─── Feature 1.4: Split validation ─── */
    if (isSplit && !splitIsValid) {
      toast({
        title: t('transaction.validationSplitError'),
        description: splitDifference >= 0.01
          ? t('transaction.validationSplitAmounts', { total: formatAmount(totalAmount), diff: formatAmount(splitDifference) })
          : t('transaction.validationSplitRowsEmpty'),
        variant: 'destructive',
      });
      return;
    }

    let convertedAmount = normalizedAmount;
    let exchangeRate = 1;
    let exchangeSource = 'same_currency';
    let rateTimestamp = new Date().toISOString();

    if (data.currency !== currency) {
      const conversionResult = await convertAmount(normalizedAmount, data.currency, currency);
      if (conversionResult) {
        convertedAmount = conversionResult.convertedAmount;
        exchangeRate = conversionResult.rate;
        exchangeSource = conversionResult.source;
        rateTimestamp = conversionResult.timestamp;
      }
    }

    const payload = {
      user_id: user.id,
      merchant: effectiveMerchant,
      amount: convertedAmount,
      amount_original: normalizedAmount,
      currency_original: data.currency,
      amount_converted: convertedAmount,
      currency_base: currency,
      exchange_rate: exchangeRate,
      rate_timestamp: rateTimestamp,
      exchange_source: exchangeSource,
      type,
      date: data.date.toISOString(),
      category_id: isSplit
        ? null
        : (type === 'expense' || type === 'lend' || type === 'owe') ? (data.categoryId || null) : null,
      budget_id: (type === 'expense' || type === 'lend' || type === 'owe') ? linkedBudgetId : null,
      savings_goal_id: type === 'transfer' ? null : linkedGoalId,
      card_id: type === 'transfer' ? (transferFromAccountTypeId || null) : null,
      note: (() => {
        const metaParts: string[] = [];
        if (type === 'expense' && payer.trim()) metaParts.push(`[payer:${payer.trim()}]`);
        if (type === 'income' && payee.trim()) metaParts.push(`[payee:${payee.trim()}]`);
        if (isSplit && splitWith.trim()) metaParts.push(`[split_with:${splitWith.trim()}]`);
        const metaStr = metaParts.join(' ');
        return [metaStr, data.note.trim()].filter(Boolean).join(' ') || null;
      })(),
      receipt_url: type === 'transfer' ? null : (initialData?.receiptUrl || null),
      custom_category_label: isOtherCategory ? customCategoryLabel.trim() : null,
      /* ─── Feature 1.2: Tags ─── */
      tags: selectedTags,
      /* ─── Feature 1.3: Status ─── */
      status: (type === 'expense' || type === 'income') ? transactionStatus : 'cleared',
      /* ─── Feature 1.4: Split parent marker ─── */
      is_split_child: false,
      parent_transaction_id: null,
      /* ─── Phase 2.1: Transfer fields ─── */
      transfer_to_card_id: type === 'transfer' ? (transferToAccountTypeId || null) : null,
      transfer_fee: type === 'transfer' && transferFee ? Number.parseFloat(transferFee) || null : null,
      /* ─── Phase 2.3: Payment method ─── */
      payment_method: (type !== 'transfer' && paymentMethod) ? paymentMethod : null,
    };

    try {
      if (isEditMode && initialTransaction) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', initialTransaction.id);
        if (error) {
          throw error;
        }
        import('@/lib/analytics').then(({ analytics, AnalyticsEvents }) => {
          analytics.logEvent(AnalyticsEvents.EDIT_TRANSACTION, { type });
        }).catch(() => {});
        toast({ title: t('transaction.toastUpdated') });
        // Fire-and-forget: log custom category suggestion
        logCustomCategorySuggestion(customCategoryLabel);
      } else if (isSplit && type === 'expense') {
        /* ─── Feature 1.4: Insert parent + children ─── */
        const { data: parentData, error: parentError } = await supabase
          .from('transactions')
          .insert(payload)
          .select('id')
          .single();

        if (parentError || !parentData) {
          throw parentError || new Error('Failed to create parent transaction');
        }

        const parentId = parentData.id;

        // Fire-and-forget: increment category usage count for parent
        if (data.categoryId) {
          incrementUsageCount(data.categoryId);
        }

        // Insert split children in parallel
        const childInserts = splitRows.map(async (row) => {
          const childAmount = Number.parseFloat(row.amount);
          let childConverted = childAmount;
          if (data.currency !== currency) {
            const result = await convertAmount(childAmount, data.currency, currency);
            if (result) childConverted = result.convertedAmount;
          }

          return supabase.from('transactions').insert({
            user_id: user.id,
            merchant,
            amount: childConverted,
            amount_original: childAmount,
            currency_original: data.currency,
            amount_converted: childConverted,
            currency_base: currency,
            exchange_rate: exchangeRate,
            rate_timestamp: rateTimestamp,
            exchange_source: exchangeSource,
            type,
            date: data.date.toISOString(),
            category_id: row.categoryId || null,
            budget_id: null,
            savings_goal_id: null,
            card_id: null,
            note: data.note.trim() || null,
            receipt_url: null,
            custom_category_label: null,
            tags: [],
            status: 'cleared',  // Children always cleared; parent carries the reconciliation status
            is_split_child: true,
            parent_transaction_id: parentId,
          });
        });

        const results = await Promise.all(childInserts);
        const childError = results.find((r) => r.error);
        if (childError?.error) {
          logger.error(childError.error, { action: 'insert_split_children' });
          // Parent was inserted, warn user
          toast({
            title: t('transaction.toastPartialSplit'),
            description: t('transaction.toastPartialSplitDesc'),
            variant: 'destructive',
          });
        } else {
          toast({ title: t('transaction.toastSplitAdded') });
        }

        import('@/lib/analytics').then(({ analytics, AnalyticsEvents }) => {
          analytics.logEvent(AnalyticsEvents.ADD_TRANSACTION, { type, split: true, splitCount: splitRows.length });
        }).catch(() => {});

        logCustomCategorySuggestion(customCategoryLabel);

        const category = data.categoryId || 'uncategorized';
        logEvent('transaction_created', {
          amount: normalizedAmount,
          type,
          category,
          merchant,
          currency: data.currency,
          input_method: initialData?.receiptUrl ? 'receipt' : 'manual',
          day_of_week: data.date.getDay(),
          hour_of_day: new Date().getHours(),
          is_split: true,
        }).catch(() => {});
      } else {
        const { error } = await supabase.from('transactions').insert(payload);
        if (error) {
          throw error;
        }
        import('@/lib/analytics').then(({ analytics, AnalyticsEvents }) => {
          analytics.logEvent(AnalyticsEvents.ADD_TRANSACTION, { type, category: data.categoryId || 'uncategorized' });
        }).catch(() => {});
        const typeLabels: Record<string, string> = { expense: t('transaction.typeExpense'), income: t('transaction.typeIncome'), lend: t('transaction.typeLend'), owe: t('transaction.typeBorrow'), transfer: t('transaction.typeTransfer') };
        toast({ title: t('transaction.toastAdded', { type: typeLabels[type] || '' }) });
        // Fire-and-forget: increment category usage count
        if (data.categoryId) {
          incrementUsageCount(data.categoryId);
        }
        // Fire-and-forget: log custom category suggestion
        logCustomCategorySuggestion(customCategoryLabel);

        // Log transaction_created behavior event
        const category = type === 'expense' ? (data.categoryId || 'uncategorized') : null;
        logEvent('transaction_created', {
          amount: normalizedAmount,
          type,
          category,
          merchant,
          currency: data.currency,
          input_method: initialData?.receiptUrl ? 'receipt' : 'manual',
          day_of_week: data.date.getDay(),
          hour_of_day: new Date().getHours(),
        }).catch(() => {});
      }

      /* ─── Reminder insert (fire-and-forget) ─── */
      if (reminderEnabled && reminderDate && user) {
        supabase.from('payment_reminders').insert({
          user_id: user.id,
          title: data.merchant || 'Payment reminder',
          amount: Math.abs(normalizedAmount),
          currency: data.currency,
          due_date: reminderDate.toISOString(),
          status: 'upcoming',
          is_recurring: reminderEnabled && recurringInterval !== 'none',
          recurring_interval: reminderEnabled && recurringInterval !== 'none' ? recurringInterval : null,
          notify_before_days: 1,
          note: null,
        }).then(({ error }) => {
          if (error) console.warn('Reminder insert failed:', error);
        });
      }

      /* ─── Feature 1.6: Save & Add Another ─── */
      if (keepOpen && onSuccessKeepOpen) {
        // Emit event so budgets can refetch
        onSuccessKeepOpen();
        // Reset form for another entry
        form.reset({
          merchant: '',
          amount: '',
          categoryId: '',
          date: new Date(),
          note: '',
          currency,
        });
        resetFormState();
      } else {
        // Emit transaction updated event so budgets can refetch
        onSuccess();

        if (!isEditMode) {
          form.reset({
            merchant: '',
            amount: '',
            categoryId: '',
            date: new Date(),
            note: '',
            currency,
          });
          resetFormState();
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const baseCurrencySymbol = currencyData[currency]?.symbol || '$';

  return (
    <div className="px-1 sm:px-0 pb-safe-nav">
      {/* ─── Type selector: Tabs in create mode; legacy 4-button grid for lend/owe edit ─── */}
      {isEditMode && (type === 'lend' || type === 'owe') ? (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { id: 'expense', name: t('transaction.typeExpense'), icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { id: 'income', name: t('transaction.typeIncome'), icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { id: 'lend', name: t('transaction.typeLend'), icon: Handshake, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { id: 'owe', name: t('transaction.typeBorrow'), icon: Landmark, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setType(opt.id as typeof type)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all card-3d',
                type === opt.id ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border bg-card hover:bg-muted'
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', opt.bg)}>
                <opt.icon className={cn('w-4 h-4', opt.color)} />
              </div>
              <span className={cn('text-[10px] font-bold uppercase tracking-wider truncate w-full text-center')}>
                {opt.name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="relative">
          {type === 'transfer' && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm rounded-2xl p-6">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-lg font-bold text-foreground text-center">{t('common.comingSoon')}</p>
              <p className="text-sm text-muted-foreground text-center mt-1">{t('transaction.transferComingSoon')}</p>
            </div>
          )}
          <Tabs
            value={type === 'income' ? 'income' : type === 'transfer' ? 'transfer' : 'expense'}
            onValueChange={(v) => {
              const newType = v as 'expense' | 'income' | 'transfer';
              if (transferDisabled && newType === 'transfer') {
                return;
              }
              setType(newType);
              if (isSplit && newType !== 'expense') {
                setIsSplit(false);
                setSplitRows([]);
              }
              setPayer('');
              setPayee('');
              setPaymentMethod('');
            }}
            className="mb-4"
          >
            <TabsList className="w-full h-12 rounded-2xl p-1">
              <TabsTrigger
                value="expense"
                className="flex-1 rounded-xl font-bold gap-2 data-[state=active]:text-rose-500"
              >
                <ArrowUpRight className="w-4 h-4" />
                {t('transaction.typeExpense')}
              </TabsTrigger>
              <TabsTrigger
                value="income"
                className="flex-1 rounded-xl font-bold gap-2 data-[state=active]:text-emerald-500"
              >
                <ArrowDownLeft className="w-4 h-4" />
                {t('transaction.typeIncome')}
              </TabsTrigger>
              <TabsTrigger
                value="transfer"
                disabled={transferDisabled}
                className="flex-1 rounded-xl font-bold gap-2 data-[state=active]:text-blue-500 data-[disabled]:opacity-50"
              >
                <ArrowLeftRight className="w-4 h-4" />
                {t('transaction.typeTransfer')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* ─── PAYER / PAYEE contextual field ─── */}
      {type === 'expense' && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.payerOptional')}</label>
          <input
            type="text"
            placeholder={t('transaction.payerPlaceholder')}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
          />
        </div>
      )}
      {type === 'income' && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.payeeOptional')}</label>
          <input
            type="text"
            placeholder={t('transaction.payeePlaceholder')}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
          />
        </div>
      )}

      {/* ─── Phase 2.1: Transfer account fields ─── */}
      {type === 'transfer' && !transferDisabled && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.fromAccount')}</label>
            <div className="grid grid-cols-3 gap-2">
              {accountTypes.length === 0 ? (
                <div className="col-span-3 text-center py-3 text-xs text-muted-foreground">No accounts found</div>
              ) : (
                accountTypes.map((at) => (
                  <button
                    key={at.id}
                    type="button"
                    onClick={() => setTransferFromAccountTypeId(at.id)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-all',
                      transferFromAccountTypeId === at.id
                        ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                        : 'border-border/50 bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: at.color || '#7C3AED' }}
                    >
                      {at.name.charAt(0)}
                    </div>
                    <span className="truncate max-w-full">{at.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.toAccount')}</label>
            <div className="grid grid-cols-3 gap-2">
              {accountTypes.filter((at) => at.id !== transferFromAccountTypeId).length === 0 ? (
                <div className="col-span-3 text-center py-3 text-xs text-muted-foreground">No other accounts</div>
              ) : (
                accountTypes.filter((at) => at.id !== transferFromAccountTypeId).map((at) => (
                  <button
                    key={at.id}
                    type="button"
                    onClick={() => setTransferToAccountTypeId(at.id)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-medium transition-all',
                      transferToAccountTypeId === at.id
                        ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                        : 'border-border/50 bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: at.color || '#7C3AED' }}
                    >
                      {at.name.charAt(0)}
                    </div>
                    <span className="truncate max-w-full">{at.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.transferFeeOptional')}</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder={t('common.amountPlaceholder')}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-11"
              value={transferFee}
              onChange={(e) => setTransferFee(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ─── Voice / Scan quick-fill row ─── */}
      {(onVoiceRequest || onScanRequest) && (
        <div className="flex gap-2">
          {onVoiceRequest && (
            <button
              type="button"
              onClick={onVoiceRequest}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors"
            >
              <Mic className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">{t('transaction.voiceFill')}</span>
            </button>
          )}
          {onScanRequest && (
            <button
              type="button"
              onClick={onScanRequest}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-muted/50 hover:bg-muted transition-colors"
            >
              <Camera className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">{t('transaction.scanReceipt')}</span>
            </button>
          )}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => handleSubmit(data, false))}
          className="space-y-4 py-2"
        >
          {/* ─── Merchant / Description field ─── */}
          <FormField
            control={form.control}
            name="merchant"
            render={({ field }) => (
              <FormItem className="relative">
                <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {type === 'lend' ? t('transaction.descriptionLend') : type === 'owe' ? t('transaction.descriptionBorrow') : type === 'transfer' ? t('transaction.descriptionTransfer') : t('transaction.description')}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={type === 'lend' ? t('transaction.descriptionPlaceholderLendBorrow') : type === 'owe' ? t('transaction.descriptionPlaceholderLendBorrow') : type === 'transfer' ? t('transaction.descriptionPlaceholderTransfer') : t('transaction.descriptionPlaceholder')}
                    className="rounded-xl h-11"
                    {...field}
                    ref={(el) => {
                      field.ref(el);
                      merchantInputRef.current = el;
                    }}
                    onBlur={(e) => {
                      field.onBlur();
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    onFocus={() => {
                      if (merchantSuggestions.length > 0) setShowSuggestions(true);
                    }}
                  />
                </FormControl>

                {/* ─── Feature 1.5: Merchant auto-fill suggestions ─── */}
                {showSuggestions && merchantSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                    {merchantSuggestions.map((s, i) => {
                      const matchedCat = categories.find((c) => c.id === s.category_id);
                      return (
                        <button
                          key={`${s.merchant}-${i}`}
                          type="button"
                          className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            form.setValue('merchant', s.merchant);
                            if (s.category_id) {
                              const cat = categories.find((c) => c.id === s.category_id);
                              if (cat?.parent_id) {
                                setSelectedParentCategoryId(cat.parent_id);
                              } else if (cat) {
                                setSelectedParentCategoryId(cat.id);
                              }
                              form.setValue('categoryId', s.category_id);
                            }
                            if (s.type && ['expense', 'income', 'lend', 'owe', 'transfer'].includes(s.type)) {
                              setType(s.type as 'expense' | 'income' | 'lend' | 'owe' | 'transfer');
                            }
                            setShowSuggestions(false);
                            setMerchantSuggestions([]);
                          }}
                        >
                          <span className="font-medium truncate">{s.merchant}</span>
                          {matchedCat && (
                            <span className="text-xs text-muted-foreground ml-2 shrink-0">
                              {matchedCat.name}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <FormMessage />
              </FormItem>
            )}
          />

          {/* ─── Amount field ─── */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.amount')}</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field: currencyField }) =>
                      isPremium ? (
                        <Select
                          value={currencyField.value}
                          onValueChange={(value) => {
                            currencyField.onChange(value);
                          }}
                        >
                          <SelectTrigger className="w-20 h-11">
                            <SelectValue>
                              <span className="font-bold">{currencyData[currencyField.value]?.symbol || '$'}</span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(currencyData).map(([code, { symbol }]) => (
                              <SelectItem key={code} value={code}>
                                <span className="flex items-center gap-2">
                                  <span className="w-6 text-center">{symbol}</span>
                                  <span>{code}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-20 h-11 flex items-center justify-center px-3"
                          disabled
                        >
                          <span className="font-bold">{currencyData[currencyField.value]?.symbol || '$'}</span>
                        </Button>
                      )
                    }
                  />
                  <FormControl>
                    <Input 
                      type="number" 
                      inputMode="decimal" 
                      step="0.01" 
                      placeholder={t('common.amountPlaceholder')} 
                      className="flex-1 rounded-xl text-lg font-bold h-11" 
                      style={{ caretColor: 'var(--accent)' }}
                      {...field} 
                    />
                  </FormControl>
                </div>
                {convertedPreview && (
                  <p className="text-xs text-muted-foreground mt-1 px-1">≈ {formatAmount(convertedPreview.amount)}</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ─── Phase 2.3: Payment Method picker ─── */}
          {type !== 'transfer' && (
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.paymentMethod')}</label>
              <div className="grid grid-cols-6 sm:grid-cols-3 gap-2 sm:gap-2">
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([method, label]) => {
                  const icons: Record<PaymentMethod, JSX.Element> = {
                    cash: <Banknote className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />,
                    card: <CreditCard className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />,
                    bank_transfer: <Building2 className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />,
                    online: <Globe className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />,
                    cheque: <FileText className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />,
                    other: <ArrowLeftRight className="w-4 h-4 sm:w-4 sm:h-4 shrink-0" />,
                  };
                  const shortLabels: Record<PaymentMethod, string> = {
                    cash: t('transaction.paymentMethodCash'),
                    card: t('transaction.paymentMethodCard'),
                    bank_transfer: t('transaction.paymentMethodBank'),
                    online: t('transaction.paymentMethodOnline'),
                    cheque: t('transaction.paymentMethodCheque'),
                    other: t('transaction.paymentMethodOther'),
                  };
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(paymentMethod === method ? '' : method)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1 rounded-xl border text-[11px] sm:text-xs font-semibold transition-all h-12 sm:h-14 px-1',
                        'active:scale-95',
                        isSelected
                          ? 'border-accent bg-accent text-accent-foreground shadow-md ring-2 ring-accent/30'
                          : 'border-border/50 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border'
                      )}
                    >
                      {icons[method]}
                      <span className="truncate text-center leading-tight">{shortLabels[method]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Feature 1.4: Split toggle (expense only, create mode only) ─── */}
          {type !== 'transfer' && type === 'expense' && !isEditMode && (
            <div className="flex items-center justify-between py-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 cursor-pointer">
                <Split className="w-4 h-4" />
                {t('transaction.splitTransaction')}
              </label>
              <Switch
                checked={isSplit}
                onCheckedChange={(checked) => {
                  setIsSplit(checked);
                  if (checked) {
                    initializeSplit();
                  } else {
                    setSplitRows([]);
                  }
                }}
              />
            </div>
          )}

          {/* ─── Split With field ─── */}
          {isSplit && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.splitWithOptional')}</label>
              <input
                type="text"
                placeholder={t('transaction.splitWithPlaceholder')}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={splitWith}
                onChange={(e) => setSplitWith(e.target.value)}
              />
            </div>
          )}

          {/* ─── Feature 1.1: Two-level category picker (hidden when split) ─── */}
          {(type === 'expense' || type === 'lend' || type === 'owe') && !isSplit && (
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => {
                const isLendOwe = type === 'lend' || type === 'owe';
                const filteredRootCategories = isLendOwe
                  ? rootCategories.filter((cat) => !cat.is_system_category || !['lend', 'owe'].includes(cat.category_type || ''))
                  : rootCategories.filter((cat) => cat.type === 'expense');
                const currentSubs = selectedParentCategoryId ? getSubCategories(selectedParentCategoryId) : [];
                const filteredSubs = isLendOwe
                  ? currentSubs.filter((cat) => !cat.is_system_category || !['lend', 'owe'].includes(cat.category_type || ''))
                  : currentSubs.filter((cat) => cat.type === 'expense');

                return (
                  <FormItem className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {isLendOwe ? t('transaction.categoryOptional') : t('transaction.category')}
                      </FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-accent hover:text-accent/80 gap-1.5 font-medium"
                        onClick={() => {
                          if (onNavigateToCategories) {
                            onNavigateToCategories({
                              type,
                              merchant: form.getValues('merchant'),
                              amount: form.getValues('amount'),
                              categoryId: form.getValues('categoryId'),
                              date: form.getValues('date'),
                              note: form.getValues('note'),
                              currency: form.getValues('currency'),
                              payer,
                              payee,
                              splitWith,
                              selectedTags,
                              transactionStatus,
                              isSplit,
                              splitRows,
                              paymentMethod: paymentMethod || '',
                              transferFromAccountTypeId,
                              transferToAccountTypeId,
                              transferFee,
                              customCategoryLabel,
                              selectedParentCategoryId,
                            });
                          } else {
                            navigate('/categories');
                          }
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t('transaction.createNew')}
                      </Button>
                    </div>

                    {/* Parent category picker */}
                    <Select
                      value={selectedParentCategoryId}
                      onValueChange={(val) => {
                        handleParentCategoryChange(val);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder={isLendOwe ? t('transaction.selectCategoryOptional') : t('transaction.selectCategory')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl max-h-[280px]">
                        {filteredRootCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="rounded-xl py-2.5">
                            {getLocalizedCategoryName(cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Sub-category picker (only when parent has children) */}
                    {filteredSubs.length > 0 && (
                      <Select
                        value={field.value}
                        onValueChange={(val) => {
                          field.onChange(val);
                          setSelectedBudgetId(null);
                          setLinkedBudgetId(null);
                          setCustomCategoryLabel('');
                          setCustomCategoryError('');
                        }}
                      >
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder={t('transaction.selectSubCategory')} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl max-h-[280px]">
                          {filteredSubs.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="rounded-xl py-2.5">
                              {getLocalizedCategoryName(cat)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          )}

          {/* ─── Smart Suggestion Banner ─── */}
          {(type === 'expense' || type === 'income' || type === 'lend' || type === 'owe') && !isSplit && type !== 'transfer' && (
            <SuggestionBanner
              suggestion={suggestion}
              linkedBudgetId={linkedBudgetId}
              linkedGoalId={linkedGoalId}
              budgets={budgets}
              goals={activeGoals}
              onConfirm={(entityType, id) => {
                if (entityType === 'budget') {
                  setLinkedBudgetId(id);
                  setSelectedBudgetId(id);
                  setLinkedGoalId(null);
                } else {
                  setLinkedGoalId(id);
                  setLinkedBudgetId(null);
                  setSelectedBudgetId(null);
                }
              }}
              onUnlink={() => {
                setLinkedBudgetId(null);
                setSelectedBudgetId(null);
                setLinkedGoalId(null);
              }}
            />
          )}

          {/* ─── Feature 1.4: Split rows (when split is active) ─── */}
          {isSplit && type === 'expense' && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">{t('transaction.splitDetails')}</p>
              {splitRows.map((row, idx) => (
                <div key={row.id} className="flex items-start gap-2 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-border bg-card">
                  <div className="flex-1 space-y-2">
                    <Select
                      value={row.categoryId}
                      onValueChange={(val) => updateSplitRow(row.id, 'categoryId', val)}
                    >
                      <SelectTrigger className="rounded-xl text-xs h-8 sm:h-9">
                        <SelectValue placeholder={t('transaction.category')} />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {rootCategories.map((cat) => {
                          const subs = getSubCategories(cat.id);
                          if (subs.length > 0) {
                            return subs.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id} className="rounded-xl">
                                {getLocalizedCategoryName(cat)} › {getLocalizedCategoryName(sub)}
                              </SelectItem>
                            ));
                          }
                          return (
                            <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                              {getLocalizedCategoryName(cat)}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder={t('common.amountPlaceholder')}
                      className="rounded-xl text-xs sm:text-sm h-8 sm:h-9"
                      value={row.amount}
                      onChange={(e) => updateSplitRow(row.id, 'amount', e.target.value)}
                    />
                  </div>
                  {splitRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSplitRow(row.id)}
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                onClick={addSplitRow}
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('transaction.addSplit')}
              </Button>

              {/* Split total validation */}
              <div className={cn(
                'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium',
                splitIsValid
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-destructive/10 text-destructive'
              )}>
                <span>{t('transaction.splitTotal')}: {formatAmount(splitTotal)}</span>
                <span>
                  {splitIsValid
                    ? t('transaction.balanced')
                    : `${t('transaction.splitRemaining')}: ${formatAmount(totalAmount - splitTotal)}`
                  }
                </span>
              </div>
            </div>
          )}

          {isOtherCategory && !isSplit && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {type === 'income' ? t('transaction.whatIncomeFor') : t('transaction.whatExpenseFor')}
              </label>
              <Input
                placeholder={t('transaction.customCategoryPlaceholder')}
                className="rounded-xl h-11"
                value={customCategoryLabel}
                maxLength={100}
                onChange={(e) => {
                  setCustomCategoryLabel(e.target.value);
                  if (e.target.value.trim()) setCustomCategoryError('');
                }}
              />
              {customCategoryError && (
                <p className="text-xs text-destructive">{customCategoryError}</p>
              )}
              {customCategoryLabel.length > 80 && (
                <p className="text-xs text-muted-foreground text-right">{customCategoryLabel.length}/100</p>
              )}
            </div>
          )}

          {/* Budget chip suggestions — Feature 1 & 4 */}
          {(type === 'expense' || type === 'lend' || type === 'owe') && !isSplit && matchingBudgets.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.applyToBudget')}</p>
              <div className="flex flex-wrap gap-2">
                {matchingBudgets.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      const selecting = selectedBudgetId !== b.id;
                      setSelectedBudgetId(selecting ? b.id : null);
                      setLinkedBudgetId(selecting ? b.id : null);

                      if (selecting) {
                        if (!form.getValues('amount')) {
                          const fill = b.remaining > 0 ? b.remaining : b.amount;
                          if (fill > 0) form.setValue('amount', fill.toFixed(2));
                        }
                        if (!form.getValues('merchant')) {
                          const name = b.category?.name || b.name || '';
                          if (name) form.setValue('merchant', name);
                        }
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-all',
                      selectedBudgetId === b.id
                        ? 'border-accent bg-accent text-accent-foreground shadow-sm'
                        : 'border-border/50 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span>{b.category?.name || b.name || t('budget.totalBudget')}</span>
                    <span className={cn(
                      'tabular-nums text-xs',
                      selectedBudgetId === b.id ? 'opacity-80' : (b.remaining <= 0 ? 'text-destructive' : 'opacity-60')
                    )}>
                      {formatAmount(b.remaining)}
                    </span>
                  </button>
                ))}
              </div>
              {!selectedBudgetId && (
                <p className="text-xs text-muted-foreground">
                  {t('transaction.noBudgetSelected')}
                </p>
              )}
            </div>
          )}

          {/* ─── Feature 1.2: Transaction Tags ─── */}
          {type !== 'transfer' && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.tags')}</p>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                        isSelected
                          ? 'border-accent bg-accent text-accent-foreground shadow-sm'
                          : 'border-border/50 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {t(`transaction.tag${tag.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '')}`, { defaultValue: tag })}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Feature 1.3: Cleared / Uncleared status toggle ─── */}
          {(type === 'expense' || type === 'income') && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {transactionStatus === 'cleared' ? t('transaction.cleared') : t('transaction.uncleared')}
                </span>
                <button
                  type="button"
                  className="focus:outline-none"
                  onClick={() => toastInfo(
                    transactionStatus === 'cleared' ? t('transaction.cleared') : t('transaction.uncleared'),
                    transactionStatus === 'cleared'
                      ? t('transaction.clearedTooltip')
                      : t('transaction.unclearedTooltip'),
                  )}
                >
                  <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </div>
              <Switch
                checked={transactionStatus === 'cleared'}
                onCheckedChange={(checked) =>
                  setTransactionStatus(checked ? 'cleared' : 'uncleared')
                }
              />
            </div>
          )}

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.date')}</FormLabel>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl h-11">
                        <Calendar className="mr-2 h-4 w-4 opacity-50" />
                        {field.value ? format(field.value, 'MMM dd, yyyy') : t('transaction.pickDate')}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setDateOpen(false);
                      }}
                      defaultMonth={field.value || new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t('transaction.noteOptional')}</FormLabel>
                <FormControl>
                  <Textarea placeholder={t('transaction.notePlaceholder')} className="resize-none rounded-xl text-sm min-h-[60px]" rows={2} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* ─── Reminder toggle ─── */}
          {(type === 'expense' || type === 'income') && type !== 'transfer' && (
            <div className="space-y-3 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4" /> {t('transaction.setReminder')}
                </label>
                <Switch
                  checked={reminderEnabled}
                  onCheckedChange={(checked) => {
                    setReminderEnabled(checked);
                    if (!checked) {
                      setReminderDate(undefined);
                      setRecurringInterval('monthly');
                    }
                  }}
                />
              </div>
              {reminderEnabled && (
                <>
                  <Popover open={reminderDateOpen} onOpenChange={setReminderDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl h-11">
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                        {reminderDate ? format(reminderDate, 'MMM dd, yyyy') : t('transaction.remindMeOn')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="end">
                      <CalendarComponent
                        mode="single"
                        selected={reminderDate}
                        onSelect={(d) => { setReminderDate(d ?? undefined); setReminderDateOpen(false); }}
                        defaultMonth={reminderDate ?? new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Recurring interval selector */}
                  <Popover open={recurringOpen} onOpenChange={setRecurringOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl h-11">
                        <Clock className="mr-2 h-4 w-4 opacity-50" />
                        <span className="flex-1">
                          {recurringInterval === 'none' 
                            ? t('transaction.oneTime') 
                            : t(`recurring.${recurringInterval}`, recurringInterval[0].toUpperCase() + recurringInterval.slice(1))}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2 rounded-2xl shadow-2xl" align="start">
                      <div className="flex flex-col gap-1">
                        {['none', 'daily', 'weekly', 'monthly', 'yearly'].map((interval) => (
                          <Button
                            key={interval}
                            variant={recurringInterval === interval ? 'secondary' : 'ghost'}
                            className="justify-start font-normal rounded-lg"
                            onClick={() => {
                              setRecurringInterval(interval);
                              setRecurringOpen(false);
                            }}
                          >
                            {interval === 'none' 
                              ? t('transaction.oneTime') 
                              : t(`recurring.${interval}`, interval[0].toUpperCase() + interval.slice(1))}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>
          )}

          <div className="sticky bottom-0 flex items-center gap-2 pt-4 pb-2 bg-background border-t border-border/50"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
              marginLeft: '-1rem',
              marginRight: '-1rem',
              paddingLeft: '1rem',
              paddingRight: '1rem',
            }}
          >
            {/* Tertiary: Cancel (text button) */}
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onCancel} 
              className="text-muted-foreground hover:text-foreground px-2"
            >
              {t('common.cancel')}
            </Button>
            
            <div className="flex-1" />
            
            {/* ─── Feature 1.6: Save & Add Another (secondary, outlined) ─── */}
            {!isEditMode && onSuccessKeepOpen && (
              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting}
                className="text-sm font-medium border-2"
                onClick={() => form.handleSubmit((data) => handleSubmit(data, true))()}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t('transaction.saveAndNew')
                )}
              </Button>
            )}
            
            {/* Primary: Save (filled, emphasized) */}
            <Button 
              type="submit" 
              disabled={form.formState.isSubmitting} 
              className="font-bold shadow-lg"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('common.save')
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
