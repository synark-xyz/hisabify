import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, ChevronDown, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useSubscription } from '@/hooks/useSubscription';
import { useCategories } from '@/hooks/useCategories';
import { Transaction } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  mode?: 'create' | 'edit';
  initialTransaction?: Transaction | null;
  initialType?: 'expense' | 'income' | 'lend' | 'owe';
  initialData?: {
    merchant?: string;
    amount?: number;
    category?: string;
    receiptUrl?: string | null;
  };
}

interface TransactionFormValues {
  merchant: string;
  amount: string;
  categoryId: string;
  date: Date;
  note: string;
  currency: string;
}

function stripLegacyNoteTag(note: string | null): string {
  const raw = (note || '').trim();
  return raw.replace(/^\[(credit_card|utility|lend|owe|custom)\]\s*/i, '').trim();
}

export function TransactionForm({
  onSuccess,
  onCancel,
  mode = 'create',
  initialTransaction,
  initialType,
  initialData,
}: TransactionFormProps) {
  const [type, setType] = useState<'expense' | 'income'>(
    initialType === 'income' ? 'income' : 'expense'
  );
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [convertedPreview, setConvertedPreview] = useState<{ amount: number; rate: number } | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const { convertAmount } = useExchangeRate();
  const { isPremium } = useSubscription();
  const { categories } = useCategories();

  const isEditMode = mode === 'edit' && !!initialTransaction;

  const form = useForm<TransactionFormValues>({
    defaultValues: {
      merchant: initialData?.merchant || '',
      amount: initialData?.amount ? String(initialData.amount) : '',
      categoryId: initialData?.category || '',
      date: new Date(),
      note: '',
      currency,
    },
  });

  const watchedAmount = form.watch('amount');
  const watchedCurrency = form.watch('currency');

  const initializeCreateState = useCallback(() => {
    setType(initialType === 'income' ? 'income' : 'expense');
    form.reset({
      merchant: initialData?.merchant || '',
      amount: initialData?.amount ? String(initialData.amount) : '',
      categoryId: initialData?.category || '',
      date: new Date(),
      note: '',
      currency,
    });
  }, [currency, form, initialData, initialType]);

  const initializeEditState = useCallback(() => {
    if (!initialTransaction) {
      return;
    }

    setType(initialTransaction.type === 'income' ? 'income' : 'expense');
    form.reset({
      merchant: initialTransaction.merchant,
      amount: String(initialTransaction.amount_original || initialTransaction.amount),
      categoryId: initialTransaction.category_id || '',
      date: new Date(initialTransaction.date),
      note: stripLegacyNoteTag(initialTransaction.note),
      currency: initialTransaction.currency_original || currency,
    });
  }, [currency, form, initialTransaction]);

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

  const handleSubmit = async (data: TransactionFormValues) => {
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

    if (type === 'expense' && !data.categoryId) {
      form.setError('categoryId', { type: 'manual', message: 'Category is required.' });
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
      category_id: type === 'expense' ? data.categoryId : null,
      card_id: null,
      note: data.note.trim() || null,
      receipt_url: initialData?.receiptUrl || null,
    };

    try {
      if (isEditMode && initialTransaction) {
        const { error } = await supabase.from('transactions').update(payload).eq('id', initialTransaction.id);
        if (error) {
          throw error;
        }
        toast({ title: 'Transaction updated!' });
      } else {
        const { error } = await supabase.from('transactions').insert(payload);
        if (error) {
          throw error;
        }
        toast({ title: `${type === 'expense' ? 'Expense' : 'Income'} added!` });
      }

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
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const baseCurrencySymbol = currencyData[currency]?.symbol || '$';

  return (
    <div className="overflow-y-auto px-4 pb-safe-nav h-full">
      <div className="flex gap-2 mb-6">
        {[
          { id: 'expense', name: 'Expense', icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { id: 'income', name: 'Income', icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map((opt: { id: 'expense' | 'income'; name: string; icon: typeof ArrowUpRight; color: string; bg: string }) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setType(opt.id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all card-3d',
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
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
          <FormField
            control={form.control}
            name="merchant"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Description</FormLabel>
                <FormControl>
                  <Input placeholder="What was this for?" className="rounded-xl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                  <p className="text-xs text-muted-foreground mt-1 px-1">≈ {baseCurrencySymbol}{convertedPreview.amount.toFixed(2)} {currency}</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {type === 'expense' && (
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-2xl">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
