import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, ChevronDown, Calendar, ArrowUpRight, ArrowDownLeft, Handshake, Landmark, Plus, X, Split } from 'lucide-react';
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
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useSubscription } from '@/hooks/useSubscription';
import { useCategories } from '@/hooks/useCategories';
import { useBudgetContext } from '@/hooks/useBudgetContext';
import { useUserBehavior } from '@/hooks/useUserBehavior';
import { Transaction } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface TransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  onSuccessKeepOpen?: () => void;
  mode?: 'create' | 'edit';
  initialTransaction?: Transaction | null;
  initialType?: 'expense' | 'income' | 'lend' | 'owe';
  initialData?: {
    merchant?: string;
    amount?: number;
    category?: string;
    receiptUrl?: string | null;
    date?: Date;
  };
  initialBudgetId?: string | null;
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

/* ─── Constants ─── */
const PREDEFINED_TAGS = ['Tax Deductible', 'Reimbursable', 'Business', 'Personal', 'Vacation', 'Medical'] as const;

function stripLegacyNoteTag(note: string | null): string {
  const raw = (note || '').trim();
  return raw.replace(/^\[(credit_card|utility|lend|owe|custom)\]\s*/i, '').trim();
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
}: TransactionFormProps) {
  const [type, setType] = useState<'expense' | 'income' | 'lend' | 'owe'>(
    initialType || 'expense'
  );
  const [currencyOpen, setCurrencyOpen] = useState(false);
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
  const { logEvent } = useUserBehavior();
  const { categories } = useCategories();
  const { getBudgetsForCategory } = useBudgetContext();

  const isEditMode = mode === 'edit' && !!initialTransaction;

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

  // Sync form currency when useCurrency() resolves from DB — skip if scan already detected a currency
  useEffect(() => {
    if (!isEditMode && !initialData?.currency) {
      form.setValue('currency', currency);
    }
  }, [currency]); // eslint-disable-line react-hooks/exhaustive-deps

  const form = useForm<TransactionFormValues>({
    defaultValues: {
      merchant: initialData?.merchant || '',
      amount: initialData?.amount ? String(initialData.amount) : '',
      categoryId: initialData?.category || '',
      date: initialData?.date || new Date(),
      note: '',
      currency,
    },
  });

  const watchedAmount = form.watch('amount');
  const watchedCurrency = form.watch('currency');
  const watchedCategoryId = form.watch('categoryId');

  const selectedCategory = categories.find((c) => c.id === watchedCategoryId);
  const isOtherCategory = selectedCategory?.name?.toLowerCase() === 'other' && !selectedCategory?.is_system_category;

  const matchingBudgets = useMemo(() => {
    if ((type !== 'expense' && type !== 'lend' && type !== 'owe') || !watchedCategoryId) return [];
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
    resetFormState();
  }, [currency, form, initialData, initialType, initialBudgetId, resetFormState]);

  const initializeEditState = useCallback(() => {
    if (!initialTransaction) {
      return;
    }

    setType((initialTransaction.type as 'expense' | 'income' | 'lend' | 'owe') || 'expense');
    form.reset({
      merchant: initialTransaction.merchant,
      amount: String(initialTransaction.amount_original || initialTransaction.amount),
      categoryId: initialTransaction.category_id || '',
      date: new Date(initialTransaction.date),
      note: stripLegacyNoteTag(initialTransaction.note),
      currency: initialTransaction.currency_original || currency,
    });
    setSelectedBudgetId(initialTransaction.budget_id ?? null);
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
    // Don't show suggestions for lend/owe types
    if (type === 'lend' || type === 'owe') {
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
    supabase.rpc('upsert_custom_category_suggestion', {
      p_label: label.trim(),
      // lend/owe treated as expense for suggestion analytics purposes
      p_category_type: type === 'income' ? 'income' : 'expense',
      p_user_id: user.id,
    }).then(({ error }) => {
      if (error) logger.error(error, { action: 'upsert_custom_category_suggestion' });
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

    if (!merchant) {
      form.setError('merchant', { type: 'manual', message: 'Description is required.' });
      return;
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      form.setError('amount', { type: 'manual', message: 'Amount must be greater than 0.' });
      return;
    }

    if (!hasValidDate) {
      form.setError('date', { type: 'manual', message: 'Date is required.' });
      return;
    }

    /* ─── Feature 1.4: Skip category validation when split ─── */
    if (type === 'expense' && !isSplit && !data.categoryId) {
      form.setError('categoryId', { type: 'manual', message: 'Category is required.' });
      return;
    }

    if (isOtherCategory && !customCategoryLabel.trim()) {
      setCustomCategoryError('Please describe this category');
      return;
    }

    /* ─── Feature 1.4: Split validation ─── */
    if (isSplit && !splitIsValid) {
      toast({
        title: 'Split Error',
        description: splitDifference >= 0.01
          ? `Split amounts must equal the total (${formatAmount(totalAmount)}). Difference: ${formatAmount(splitDifference)}`
          : 'Each split row needs a category and amount greater than 0.',
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
      merchant,
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
      budget_id: (type === 'expense' || type === 'lend' || type === 'owe') ? (selectedBudgetId ?? null) : null,
      savings_goal_id: initialTransaction?.savings_goal_id ?? null,
      card_id: null,
      note: data.note.trim() || null,
      receipt_url: initialData?.receiptUrl || null,
      custom_category_label: isOtherCategory ? customCategoryLabel.trim() : null,
      /* ─── Feature 1.2: Tags ─── */
      tags: selectedTags.length > 0 ? selectedTags : null,
      /* ─── Feature 1.3: Status ─── */
      status: (type === 'expense' || type === 'income') ? transactionStatus : null,
      /* ─── Feature 1.4: Split parent marker ─── */
      is_split_child: false,
      parent_transaction_id: null,
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
        toast({ title: 'Transaction updated!' });
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
            tags: null,
            status: transactionStatus,
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
            title: 'Partial split saved',
            description: 'Parent transaction saved but some split rows failed.',
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Split expense added!' });
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
        const typeLabels: Record<string, string> = { expense: 'Expense', income: 'Income', lend: 'Lend', owe: 'Borrow' };
        toast({ title: `${typeLabels[type] || 'Transaction'} added!` });
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

      /* ─── Feature 1.6: Save & Add Another ─── */
      if (keepOpen && onSuccessKeepOpen) {
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
    <div className="overflow-y-auto px-4 pb-safe-nav h-full">
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { id: 'expense', name: 'Expense', icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { id: 'income', name: 'Income', icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { id: 'lend', name: 'Lend', icon: Handshake, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { id: 'owe', name: 'Borrow', icon: Landmark, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((opt: { id: 'expense' | 'income' | 'lend' | 'owe'; name: string; icon: typeof ArrowUpRight; color: string; bg: string }) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setType(opt.id);
              // Reset split when switching away from expense
              if (opt.id !== 'expense' && isSplit) {
                setIsSplit(false);
                setSplitRows([]);
              }
            }}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all card-3d',
              type === opt.id ? 'border-accent bg-accent/5 ring-1 ring-accent/20 border-glow' : 'border-border bg-card hover:bg-muted'
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', opt.bg)}>
              <opt.icon className={cn('w-5 h-5', opt.color, 'icon-glow')} />
            </div>
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', type === opt.id && 'text-glow')}>
              {opt.name}
            </span>
          </button>
        ))}
      </div>

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
                <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                  {type === 'lend' ? 'Who are you lending to?' : type === 'owe' ? 'Who are you borrowing from?' : 'Description'}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={type === 'lend' ? 'Name or @handle' : type === 'owe' ? 'Name or @handle' : 'What was this for?'}
                    className="rounded-xl"
                    {...field}
                    ref={(el) => {
                      field.ref(el);
                      merchantInputRef.current = el;
                    }}
                    onBlur={(e) => {
                      field.onBlur();
                      // Delay hiding to allow click on suggestion
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
                              // Set category — also update parent category for sub-category support
                              const cat = categories.find((c) => c.id === s.category_id);
                              if (cat?.parent_id) {
                                setSelectedParentCategoryId(cat.parent_id);
                              } else if (cat) {
                                setSelectedParentCategoryId(cat.id);
                              }
                              form.setValue('categoryId', s.category_id);
                            }
                            if (s.type && ['expense', 'income', 'lend', 'owe'].includes(s.type)) {
                              setType(s.type as 'expense' | 'income' | 'lend' | 'owe');
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
                <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Amount</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field: currencyField }) =>
                      isPremium ? (
                        <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="w-20 flex items-center justify-between px-3">
                              <span className="font-bold">{currencyData[currencyField.value]?.symbol || '$'}</span>
                              <ChevronDown className="w-3 h-3 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-1 rounded-2xl shadow-xl" align="start">
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              {Object.entries(currencyData).map(([code, { symbol }]) => (
                                <button
                                  key={code}
                                  type="button"
                                  onClick={() => {
                                    currencyField.onChange(code);
                                    setCurrencyOpen(false);
                                  }}
                                  className={cn(
                                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-muted transition-colors',
                                    currencyField.value === code && 'bg-muted font-bold'
                                  )}
                                >
                                  <span className="w-6 text-center">{symbol}</span>
                                  <span>{code}</span>
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-20 flex items-center justify-center px-3"
                          disabled
                        >
                          <span className="font-bold">{currencyData[currencyField.value]?.symbol || '$'}</span>
                        </Button>
                      )
                    }
                  />
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" className="flex-1 rounded-xl text-lg font-bold" {...field} />
                  </FormControl>
                </div>
                {convertedPreview && (
                  <p className="text-xs text-muted-foreground mt-1 px-1">≈ {formatAmount(convertedPreview.amount)}</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ─── Feature 1.4: Split toggle (expense only, create mode only) ─── */}
          {type === 'expense' && !isEditMode && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Split className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">Split Transaction</span>
              </div>
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

          {/* ─── Feature 1.1: Two-level category picker (hidden when split) ─── */}
          {(type === 'expense' || type === 'lend' || type === 'owe') && !isSplit && (
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => {
                const isLendOwe = type === 'lend' || type === 'owe';
                const filteredRootCategories = isLendOwe
                  ? rootCategories.filter((cat) => !cat.is_system_category || !['lend', 'owe'].includes(cat.category_type || ''))
                  : rootCategories;
                const currentSubs = selectedParentCategoryId ? getSubCategories(selectedParentCategoryId) : [];
                const filteredSubs = isLendOwe
                  ? currentSubs.filter((cat) => !cat.is_system_category || !['lend', 'owe'].includes(cat.category_type || ''))
                  : currentSubs;

                return (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {isLendOwe ? 'Category (optional)' : 'Category'}
                    </FormLabel>

                    {/* Parent category picker */}
                    <Select
                      value={selectedParentCategoryId}
                      onValueChange={(val) => {
                        handleParentCategoryChange(val);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={isLendOwe ? 'Select category (optional)' : 'Select category'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl">
                        {filteredRootCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                            {cat.name}
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
                          setCustomCategoryLabel('');
                          setCustomCategoryError('');
                        }}
                      >
                        <SelectTrigger className="rounded-xl mt-2">
                          <SelectValue placeholder="Select sub-category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {filteredSubs.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                              {cat.name}
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

          {/* ─── Feature 1.4: Split rows (when split is active) ─── */}
          {isSplit && type === 'expense' && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">Split Details</p>
              {splitRows.map((row, idx) => (
                <div key={row.id} className="flex items-start gap-2 p-3 rounded-2xl border border-border bg-card">
                  <div className="flex-1 space-y-2">
                    <Select
                      value={row.categoryId}
                      onValueChange={(val) => updateSplitRow(row.id, 'categoryId', val)}
                    >
                      <SelectTrigger className="rounded-xl text-xs h-9">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {rootCategories.map((cat) => {
                          const subs = getSubCategories(cat.id);
                          if (subs.length > 0) {
                            return subs.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id} className="rounded-xl">
                                {cat.name} &gt; {sub.name}
                              </SelectItem>
                            ));
                          }
                          return (
                            <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                              {cat.name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="rounded-xl text-sm h-9"
                      value={row.amount}
                      onChange={(e) => updateSplitRow(row.id, 'amount', e.target.value)}
                    />
                  </div>
                  {splitRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSplitRow(row.id)}
                    >
                      <X className="w-4 h-4" />
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
                Add Split
              </Button>

              {/* Split total validation */}
              <div className={cn(
                'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium',
                splitIsValid
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-destructive/10 text-destructive'
              )}>
                <span>Split Total: {formatAmount(splitTotal)}</span>
                <span>
                  {splitIsValid
                    ? 'Balanced'
                    : `Remaining: ${formatAmount(totalAmount - splitTotal)}`
                  }
                </span>
              </div>
            </div>
          )}

          {isOtherCategory && !isSplit && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70">
                {type === 'income' ? 'What is this income for?' : 'What is this expense for?'}
              </label>
              <Input
                placeholder="e.g. Pet supplies, Wedding gift…"
                className="rounded-xl"
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
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">Apply to Budget</p>
              <div className="flex flex-wrap gap-2">
                {matchingBudgets.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      const selecting = selectedBudgetId !== b.id;
                      setSelectedBudgetId(selecting ? b.id : null);

                      if (selecting) {
                        // Auto-fill amount if field is currently empty
                        if (!form.getValues('amount')) {
                          const fill = b.remaining > 0 ? b.remaining : b.amount;
                          if (fill > 0) form.setValue('amount', fill.toFixed(2));
                        }
                        // Auto-fill merchant/description if field is currently empty
                        if (!form.getValues('merchant')) {
                          const name = b.category?.name || b.name || '';
                          if (name) form.setValue('merchant', name);
                        }
                      }
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      selectedBudgetId === b.id
                        ? 'border-accent bg-accent/10 text-foreground ring-1 ring-accent/30'
                        : 'border-border bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    <span>{b.category?.name || b.name || 'Total Budget'}</span>
                    <span className={cn(
                      'tabular-nums text-[10px]',
                      b.remaining <= 0 ? 'text-destructive' : 'opacity-60'
                    )}>
                      {formatAmount(b.remaining)} left
                    </span>
                  </button>
                ))}
              </div>
              {!selectedBudgetId && (
                <p className="text-[10px] text-muted-foreground">
                  No budget selected — expense will be unbudgeted
                </p>
              )}
            </div>
          )}

          {/* ─── Feature 1.2: Transaction Tags ─── */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">Tags</p>
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
                        ? 'border-accent bg-accent/10 text-foreground ring-1 ring-accent/30'
                        : 'border-border bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Feature 1.3: Cleared / Uncleared status toggle ─── */}
          {(type === 'expense' || type === 'income') && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                {transactionStatus === 'cleared' ? 'Cleared' : 'Uncleared'}
              </span>
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
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Date</FormLabel>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4 opacity-50" />
                        {field.value ? format(field.value, 'MMM dd, yyyy') : 'Pick date'}
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
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Note (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Add details..." className="resize-none rounded-xl" rows={2} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-6 pb-2">
            <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            {/* ─── Feature 1.6: Save & Add Another (create mode only) ─── */}
            {!isEditMode && onSuccessKeepOpen && (
              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting}
                className="flex-1"
                onClick={() => form.handleSubmit((data) => handleSubmit(data, true))()}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Save & Add Another'
                )}
              </Button>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
              {form.formState.isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Save Record'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
