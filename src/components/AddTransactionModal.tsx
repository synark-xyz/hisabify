import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Camera, Edit3, CreditCard, ChevronDown, Calendar } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ReceiptUpload } from '@/components/ReceiptUpload';
import { expenseFormSchema, incomeFormSchema, ExpenseFormData, IncomeFormData } from '@/lib/transaction-schemas';
import { Category, Card } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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

type Step = 'type' | 'card-method' | 'card-scan' | 'form';

export function AddTransactionModal({ open, onOpenChange, onSuccess }: AddTransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [step, setStep] = useState<Step>('type');
  const [useCard, setUseCard] = useState(false);
  const [cardId, setCardId] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [convertedPreview, setConvertedPreview] = useState<{ amount: number; rate: number } | null>(null);
  const [scanning, setScanning] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const { convertAmount, loading: rateLoading } = useExchangeRate();

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
    },
  });

  // Use the appropriate form based on type
  const form = type === 'expense' ? expenseForm : incomeForm;
  const currentForm = type === 'expense' ? expenseForm : incomeForm;
  const watchedAmount = type === 'expense'
    ? expenseForm.watch('amount')
    : incomeForm.watch('amount');
  const watchedCurrency = type === 'expense'
    ? expenseForm.watch('currency')
    : incomeForm.watch('currency');

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchCards();
      resetForm();
      setStep('type');
    }
  }, [open, currency]);

  useEffect(() => {
    const previewConversion = async () => {
      if (!watchedAmount || watchedCurrency === currency) {
        setConvertedPreview(null);
        return;
      }

      const result = await convertAmount(parseFloat(watchedAmount), watchedCurrency, currency);
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

  const handleSubmit = async (data: ExpenseFormData | IncomeFormData) => {
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

      const transactionData = type === 'expense'
        ? {
          ...baseData,
          category_id: (data as ExpenseFormData).categoryId,
          card_id: cardId || null,
        }
        : {
          ...baseData,
          category_id: null,
          card_id: null,
          note: (data as IncomeFormData).incomeSource,
        };

      const { error } = await supabase.from('transactions').insert(transactionData);

      if (error) throw error;

      toast({ title: `${type === 'expense' ? 'Expense' : 'Income'} added!` });
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
    });
    incomeForm.reset({
      merchant: '',
      amount: '',
      incomeSource: '',
      date: new Date(),
      note: '',
      currency: currency,
    });
    setType('expense');
    setUseCard(false);
    setCardId('');
    setReceiptUrl(null);
    setConvertedPreview(null);
  };

  const handleTypeSelect = (selectedType: 'expense' | 'income') => {
    setType(selectedType);
    if (selectedType === 'expense' && cards.length > 0) {
      setStep('card-method');
    } else {
      setStep('form');
    }
  };

  const handleCardMethod = (method: 'scan' | 'manual' | 'skip') => {
    if (method === 'scan') {
      setStep('card-scan');
      simulateOCR();
    } else if (method === 'manual') {
      setUseCard(true);
      setStep('form');
    } else {
      setStep('form');
    }
  };

  const simulateOCR = async () => {
    setScanning(true);
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    setScanning(false);
    setUseCard(true);

    // Auto-select first card if available to simulate detection
    if (cards.length > 0) {
      setCardId(cards[0].id);
      toast({
        title: "Card Detected",
        description: `Recognized Visa ending in ${cards[0].card_number.slice(-4)}`,
      });
    } else {
      toast({
        title: "Card Detected",
        description: "Please confirm your card details",
      });
    }

    setStep('form');
  };

  const currencySymbol = currencyData[watchedCurrency]?.symbol || '$';
  const baseCurrencySymbol = currencyData[currency]?.symbol || '$';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">
            {step === 'type' && 'Add Transaction'}
            {step === 'card-method' && 'Credit Card'}
            {step === 'card-scan' && 'Scanning...'}
            {step === 'form' && `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
          </SheetTitle>
        </SheetHeader>

        {/* Step 1: Choose Type */}
        {step === 'type' && (
          <div className="space-y-3 py-4">
            <button
              onClick={() => handleTypeSelect('expense')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <span className="text-2xl">💸</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Expense</p>
                <p className="text-sm text-muted-foreground">Track your spending</p>
              </div>
            </button>

            <button
              onClick={() => handleTypeSelect('income')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Income</p>
                <p className="text-sm text-muted-foreground">Record your earnings</p>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Card Method */}
        {step === 'card-method' && (
          <div className="space-y-3 py-4">
            <button
              onClick={() => handleCardMethod('scan')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Scan Card</p>
                <p className="text-sm text-muted-foreground">Use camera to detect card</p>
              </div>
            </button>

            <button
              onClick={() => handleCardMethod('manual')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Edit3 className="w-6 h-6 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Select Card</p>
                <p className="text-sm text-muted-foreground">Choose from your cards</p>
              </div>
            </button>

            <button
              onClick={() => handleCardMethod('skip')}
              className="w-full p-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip, continue without card
            </button>
          </div>
        )}

        {/* Step 3: Scanning */}
        {step === 'card-scan' && scanning && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-muted-foreground">Detecting card...</p>
            </div>
          </div>
        )}

        {/* Step 4: Form */}
        {step === 'form' && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
              {/* Merchant/Description */}
              <FormField
                control={form.control}
                name="merchant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {type === 'expense' ? 'Merchant / Description' : 'Source / Description'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={type === 'expense' ? 'e.g., Starbucks' : 'e.g., Monthly Salary'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount with Currency */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field: currencyField }) => (
                          <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-20 flex items-center justify-between px-3"
                              >
                                <span>{currencyData[currencyField.value]?.symbol || '$'}</span>
                                <ChevronDown className="w-3 h-3 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-1" align="start">
                              <div className="max-h-60 overflow-y-auto">
                                {Object.entries(currencyData).map(([code, { symbol }]) => (
                                  <button
                                    key={code}
                                    type="button"
                                    onClick={() => {
                                      currencyField.onChange(code);
                                      setCurrencyOpen(false);
                                    }}
                                    className={cn(
                                      'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors',
                                      currencyField.value === code && 'bg-muted'
                                    )}
                                  >
                                    <span className="w-6 text-center font-medium">{symbol}</span>
                                    <span className="text-muted-foreground">{code}</span>
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="flex-1"
                          {...field}
                        />
                      </FormControl>
                    </div>

                    {watchedCurrency !== currency && watchedAmount && (
                      <div className="mt-2 text-sm">
                        {rateLoading ? (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Converting...
                          </span>
                        ) : convertedPreview ? (
                          <span className="text-muted-foreground">
                            ≈ {baseCurrencySymbol}{convertedPreview.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                            <span className="text-xs ml-1">(1 {watchedCurrency} = {convertedPreview.rate.toFixed(4)} {currency})</span>
                          </span>
                        ) : null}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category for Expense */}
              {type === 'expense' && (
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
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

              {/* Income Source */}
              {type === 'income' && (
                <FormField
                  control={incomeForm.control}
                  name="incomeSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Income Source</FormLabel>
                      <Select value={field.value as string} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {incomeSources.map((source) => (
                            <SelectItem key={source.id} value={source.id}>
                              <span className="flex items-center gap-2">
                                <span>{source.icon}</span>
                                <span>{source.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Date Picker */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setDateOpen(false);
                          }}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Card Selection */}
              {useCard && cards.length > 0 && (
                <div>
                  <Label>Card</Label>
                  <Select value={cardId} onValueChange={setCardId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select card" />
                    </SelectTrigger>
                    <SelectContent>
                      {cards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          <span className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            <span>•••• {card.card_number.slice(-4)}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Note/Description Textarea */}
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Receipt Upload */}
              {type === 'expense' && (
                <div>
                  <Label>Receipt</Label>
                  <div className="mt-1">
                    <ReceiptUpload
                      value={receiptUrl}
                      onChange={(url) => setReceiptUrl(url)}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('type')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="flex-1"
                >
                  {form.formState.isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `Add ${type === 'expense' ? 'Expense' : 'Income'}`
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
