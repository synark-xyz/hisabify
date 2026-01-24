import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CreditCard, ChevronDown, Calendar, ArrowUpRight, ArrowDownLeft, Handshake, Landmark, Bell, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ReceiptUpload } from '@/components/ReceiptUpload';
import { expenseFormSchema, incomeFormSchema, ExpenseFormData, IncomeFormData } from '@/lib/transaction-schemas';
import { Category, Card } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { schedulePaymentReminder, requestNotificationPermission } from '@/lib/notifications';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialType?: 'expense' | 'income' | 'lend' | 'owe';
}

const incomeSources = [
  { id: 'salary', name: 'Salary', icon: '💼' },
  { id: 'freelance', name: 'Freelance', icon: '💻' },
  { id: 'investment', name: 'Investment', icon: '📈' },
  { id: 'rental', name: 'Rental Income', icon: '🏠' },
  { id: 'gift', name: 'Gift', icon: '🎁' },
  { id: 'refund', name: 'Refund', icon: '💰' },
  { id: 'other', name: 'Other', icon: '📝' },
];

const paymentCategories = [
  { id: 'credit_card', name: 'Credit Card Bill', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'utility', name: 'Utility Bill', icon: <Landmark className="w-4 h-4" /> },
  { id: 'lend', name: 'Lend Money', icon: <Handshake className="w-4 h-4" /> },
  { id: 'owe', name: 'Owe / Debt', icon: <Landmark className="w-4 h-4" /> },
  { id: 'custom', name: 'Custom Field', icon: <Edit3 className="w-4 h-4" /> },
];

export function AddTransactionModal({ open, onOpenChange, onSuccess, initialType }: AddTransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [type, setType] = useState<'expense' | 'income' | 'lend' | 'owe'>(initialType || 'expense');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [convertedPreview, setConvertedPreview] = useState<{ amount: number; rate: number } | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const { convertAmount } = useExchangeRate();

  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      merchant: '',
      amount: '',
      categoryId: '',
      date: new Date(),
      note: '',
      currency: currency,
      cardId: '',
      paymentType: '',
      createReminder: false,
    },
  });

  const incomeForm = useForm<IncomeFormData>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      merchant: '',
      amount: '',
      incomeSource: '',
      date: new Date(),
      note: '',
      currency: currency,
      createReminder: false,
    },
  });

  const form = (type === 'income') ? incomeForm : expenseForm;
  const watchedAmount = (type === 'income' ? incomeForm.watch('amount') : expenseForm.watch('amount')) as any as string;
  const watchedCurrency = (type === 'income' ? incomeForm.watch('currency') : expenseForm.watch('currency')) as any as string;

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchCards();
      if (initialType) setType(initialType);
    }
  }, [open, initialType]);

  useEffect(() => {
    const previewConversion = async () => {
      if (!watchedAmount || watchedCurrency === currency) {
        setConvertedPreview(null);
        return;
      }

      const amountNum = parseFloat(watchedAmount);
      if (isNaN(amountNum)) return;

      const result = await convertAmount(amountNum, watchedCurrency, currency);
      if (result) {
        setConvertedPreview({
          amount: result.convertedAmount,
          rate: result.rate
        });
      }
    };

    const debounce = setTimeout(previewConversion, 500);
    return () => clearTimeout(debounce);
  }, [watchedAmount, watchedCurrency, currency]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data as Category[]);
  };

  const fetchCards = async () => {
    if (!user) return;
    const { data } = await supabase.from('cards').select('*').eq('user_id', user.id);
    if (data) setCards(data as unknown as Card[]);
  };

  const handleSubmit = async (data: any) => {
    if (!user) return;

    try {
      const originalAmount = parseFloat(data.amount);
      let convertedAmount = originalAmount;
      let exchangeRate = 1;
      let exchangeSource = 'same_currency';
      let rateTimestamp = new Date().toISOString();

      if (data.currency !== currency) {
        const conversionResult = await convertAmount(originalAmount, data.currency, currency);

        if (conversionResult) {
          convertedAmount = conversionResult.convertedAmount;
          exchangeRate = conversionResult.rate;
          exchangeSource = conversionResult.source;
          rateTimestamp = conversionResult.timestamp;
        } else {
          toast({
            title: 'Warning',
            description: 'Could not fetch exchange rate. Transaction saved with original amount.',
            variant: 'destructive'
          });
        }
      }

      const baseData = {
        user_id: user.id,
        merchant: data.merchant,
        amount: convertedAmount,
        amount_original: originalAmount,
        currency_original: data.currency,
        amount_converted: convertedAmount,
        currency_base: currency,
        exchange_rate: exchangeRate,
        rate_timestamp: rateTimestamp,
        exchange_source: exchangeSource,
        type,
        date: data.date.toISOString(),
        note: data.note || null,
        receipt_url: receiptUrl,
      };

      const transactionData = (type === 'income')
        ? {
          ...baseData,
          category_id: null,
          card_id: null,
          note: data.incomeSource || data.note,
        }
        : {
          ...baseData,
          category_id: data.categoryId || null,
          card_id: data.cardId || null,
          note: data.paymentType ? `[${data.paymentType}] ${data.note || ''}` : data.note,
        };

      const { error } = await supabase.from('transactions').insert(transactionData);

      if (error) throw error;

      if (data.createReminder) {
        await supabase.from('payment_reminders').insert({
          user_id: user.id,
          title: `${type === 'lend' ? 'Lend Repayment' : type === 'owe' ? 'Debt Payment' : data.merchant}`,
          amount: originalAmount,
          due_date: data.date.toISOString(),
          status: 'upcoming',
          notify_before_days: 1,
          is_recurring: false,
          note: `Auto-generated from ${type} transaction`,
        });

        const granted = await requestNotificationPermission();
        if (granted) {
          schedulePaymentReminder({
            title: data.merchant,
            amount: originalAmount,
            due_date: data.date.toISOString(),
          });
        }
      }

      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} added!` });
      onSuccess();
      resetForm();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    expenseForm.reset({
      merchant: '',
      amount: '',
      categoryId: '',
      date: new Date(),
      note: '',
      currency: currency,
      cardId: '',
      paymentType: '',
      createReminder: false,
    });
    incomeForm.reset({
      merchant: '',
      amount: '',
      incomeSource: '',
      date: new Date(),
      note: '',
      currency: currency,
      createReminder: false,
    });
    setType('expense');
    setReceiptUrl(null);
    setConvertedPreview(null);
  };

  const baseCurrencySymbol = currencyData[currency]?.symbol || '$';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[95vh] rounded-t-3xl overflow-y-auto pb-safe-nav">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-bold text-xl">
            {`Add ${type.charAt(0).toUpperCase() + type.slice(1)}`}
          </SheetTitle>
        </SheetHeader>

        <div className="flex gap-2 mb-6">
          {[
            { id: 'expense', name: 'Expense', icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-500/10' },
            { id: 'income', name: 'Income', icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { id: 'lend', name: 'Lend', icon: Handshake, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { id: 'owe', name: 'Owe', icon: Landmark, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setType(opt.id as any)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all",
                type === opt.id
                  ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", opt.bg)}>
                <opt.icon className={cn("w-5 h-5", opt.color)} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{opt.name}</span>
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
                      render={({ field: currencyField }) => (
                        <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="w-20 rounded-xl flex items-center justify-between px-3">
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
                      )}
                    />
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" className="flex-1 rounded-xl text-lg font-bold" {...field} />
                    </FormControl>
                  </div>
                  {convertedPreview && (
                    <p className="text-xs text-muted-foreground mt-1 px-1">
                      ≈ {baseCurrencySymbol}{convertedPreview.amount.toFixed(2)} {currency}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {type !== 'income' && (
                <FormField
                  control={expenseForm.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl">
                          {paymentCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                              <div className="flex items-center gap-2">
                                {cat.icon}
                                <span>{cat.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              {type === 'expense' && !expenseForm.getValues('paymentType') && (
                <FormField
                  control={expenseForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Budget Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Budget" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl">
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} className="rounded-xl">{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {type === 'income' && (
                <FormField
                  control={incomeForm.control}
                  name="incomeSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Source</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl">
                          {incomeSources.map((source) => (
                            <SelectItem key={source.id} value={source.id} className="rounded-xl">
                              {source.icon} {source.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                          <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl">
                            <Calendar className="mr-2 h-4 w-4 opacity-50" />
                            {field.value ? format(field.value, 'MMM dd, yyyy') : 'Pick date'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50 rounded-2xl shadow-2xl" align="end">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => { field.onChange(date); setDateOpen(false); }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <Bell className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <Label className="text-sm font-bold">Set Reminder</Label>
                  <p className="text-xs text-muted-foreground">Notify me on the due date</p>
                </div>
              </div>
              <FormField
                control={form.control}
                name="createReminder"
                render={({ field }) => (
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                )}
              />
            </div>

            {type !== 'income' && cards.length > 0 && (
              <FormField
                control={expenseForm.control}
                name="cardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Payment Method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select card" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-2xl">
                        {cards.map((card) => (
                          <SelectItem key={card.id} value={card.id} className="rounded-xl">
                            •••• {card.card_number.slice(-4)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">Note</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add details..." className="resize-none rounded-xl" rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {(type === 'expense' || type === 'lend') && (
              <div className="pt-2">
                <ReceiptUpload value={receiptUrl} onChange={setReceiptUrl} />
              </div>
            )}

            <div className="flex gap-3 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-sm pb-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 text-muted-foreground rounded-2xl">Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1 bg-accent hover:bg-accent/90 rounded-2xl shadow-fab font-bold">
                {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Record'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
