import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, CreditCard, ChevronDown, Calendar, ArrowUpRight, ArrowDownLeft, Handshake, Landmark, Edit3 } from 'lucide-react';
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
import { useSubscription } from '@/hooks/useSubscription';
import { ReceiptUpload } from '@/components/ReceiptUpload';
import { Category, Card } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useBudgetContext } from '@/hooks/useBudgetContext';
import { BudgetWithSpending } from '@/hooks/useBudgets';
import { BudgetStatusCard } from '@/components/BudgetStatusCard';
import { BudgetSuggestions } from '@/components/BudgetSuggestions';
import { BudgetExceedDialog } from '@/components/BudgetExceedDialog';

interface TransactionFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    initialType?: 'expense' | 'income' | 'lend' | 'owe';
    initialData?: {
        merchant?: string;
        amount?: number;
        category?: string;
    };
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

type PaymentType = '' | 'credit_card' | 'utility' | 'lend' | 'owe' | 'custom';

interface TransactionFormValues {
    merchant: string;
    amount: string;
    categoryId: string;
    incomeSource: string;
    date: Date;
    note: string;
    currency: string;
    cardId: string;
    paymentType: PaymentType;
}

interface BudgetStatus {
    hasActiveBudget: boolean;
    budget: BudgetWithSpending | null;
    remaining: number;
    wouldExceed: boolean;
    status: 'safe' | 'warning' | 'exceeded';
    message?: string;
}

export function TransactionForm({ onSuccess, onCancel, initialType, initialData }: TransactionFormProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [systemCategories, setSystemCategories] = useState<Category[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [type, setType] = useState<'expense' | 'income' | 'lend' | 'owe'>(initialType || 'expense');
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    const [currencyOpen, setCurrencyOpen] = useState(false);
    const [dateOpen, setDateOpen] = useState(false);
    const [convertedPreview, setConvertedPreview] = useState<{ amount: number; rate: number } | null>(null);
    const [customCategory, setCustomCategory] = useState('');

    const { user } = useAuth();
    const { toast } = useToast();
    const { currency } = useCurrency();
    const { convertAmount } = useExchangeRate();
    const { isPremium } = useSubscription();
    const { getBudgetStatus, suggestBudgets } = useBudgetContext();
    const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
    const [showBudgetExceedDialog, setShowBudgetExceedDialog] = useState(false);
    const [pendingSubmission, setPendingSubmission] = useState<TransactionFormValues | null>(null);

    const form = useForm<TransactionFormValues>({
        defaultValues: {
            merchant: initialData?.merchant || '',
            amount: initialData?.amount ? String(initialData.amount) : '',
            categoryId: '',
            incomeSource: '',
            date: new Date(),
            note: '',
            currency: currency,
            cardId: '',
            paymentType: '',
        },
    });

    const watchedAmount = form.watch('amount');
    const watchedCurrency = form.watch('currency');
    const watchedCategoryId = form.watch('categoryId');
    const watchedPaymentType = form.watch('paymentType');
    const watchedType = type;

    const fetchCategories = useCallback(async () => {
        const { data } = await supabase.from('categories').select('*').eq('is_system_category', false);
        if (data) {
            setCategories(data as Category[]);
        }

        const { data: systemData } = await supabase.from('categories').select('*').eq('is_system_category', true);
        if (systemData) {
            setSystemCategories(systemData as Category[]);
        }
    }, []);

    const fetchCards = useCallback(async () => {
        if (!user) {
            setCards([]);
            return;
        }

        const { data } = await supabase.from('cards').select('*').eq('user_id', user.id);
        if (data) {
            setCards(data as unknown as Card[]);
        }
    }, [user]);

    useEffect(() => {
        void fetchCategories();
        void fetchCards();
        if (initialType) {
            setType(initialType);
        }
    }, [initialType, fetchCategories, fetchCards]);

    // Calculate budget status when amount or category changes
    useEffect(() => {
        if (watchedType === 'expense' && watchedAmount && watchedCategoryId) {
            const amountNum = parseFloat(watchedAmount);
            if (!isNaN(amountNum)) {
                const status = getBudgetStatus(watchedCategoryId, amountNum);
                setBudgetStatus(status);
            }
        } else {
            setBudgetStatus(null);
        }
    }, [watchedAmount, watchedCategoryId, watchedType, getBudgetStatus]);

    // Handle initialData updates (e.g. from Voice/Scan)
    useEffect(() => {
        if (initialData) {
            if (initialData.merchant) {
                form.setValue('merchant', initialData.merchant);
            }
            if (initialData.amount) {
                form.setValue('amount', String(initialData.amount));
            }
        }
    }, [initialData, form]);

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
    }, [watchedAmount, watchedCurrency, currency, convertAmount]);

    const getSystemCategoryId = useCallback((paymentType: PaymentType): string | null => {
        const mapping: Record<Exclude<PaymentType, ''>, string | undefined> = {
            credit_card: systemCategories.find((category) => category.category_type === 'credit_card')?.id,
            utility: systemCategories.find((category) => category.category_type === 'utility')?.id,
            lend: systemCategories.find((category) => category.category_type === 'lend')?.id,
            owe: systemCategories.find((category) => category.category_type === 'owe')?.id,
            custom: systemCategories.find((category) => category.category_type === 'other')?.id,
        };

        if (!paymentType) {
            return null;
        }

        return mapping[paymentType] || null;
    }, [systemCategories]);

    const handleSubmit = async (data: TransactionFormValues) => {
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

        if (type === 'expense') {
            if (!data.paymentType && !data.categoryId) {
                form.setError('categoryId', { type: 'manual', message: 'Please select a category.' });
                return;
            }

            if (cards.length > 0 && !data.cardId) {
                form.setError('cardId', { type: 'manual', message: 'Please select a payment method.' });
                return;
            }

            if (data.paymentType === 'custom' && !customCategory.trim()) {
                toast({
                    title: 'Custom category required',
                    description: 'Add a custom category name before saving.',
                    variant: 'destructive'
                });
                return;
            }
        }

        const normalizedData: TransactionFormValues = {
            ...data,
            merchant,
            amount: normalizedAmount.toString(),
            note: data.note.trim(),
        };

        const effectiveCategoryId = normalizedData.paymentType
            ? getSystemCategoryId(normalizedData.paymentType)
            : (normalizedData.categoryId || null);

        if (type === 'expense' && effectiveCategoryId) {
            const status = getBudgetStatus(effectiveCategoryId, normalizedAmount);
            if (status.wouldExceed) {
                setPendingSubmission(normalizedData);
                setShowBudgetExceedDialog(true);
                return;
            }
        }

        await processTransaction(normalizedData, normalizedAmount);
    };

    const handleBudgetExceedConfirm = async () => {
        setShowBudgetExceedDialog(false);
        if (pendingSubmission) {
            const pendingAmount = Number.parseFloat(pendingSubmission.amount);
            if (!Number.isFinite(pendingAmount) || pendingAmount <= 0) {
                toast({
                    title: 'Unable to save',
                    description: 'Transaction amount is invalid. Please try again.',
                    variant: 'destructive'
                });
                setPendingSubmission(null);
                return;
            }
            await processTransaction(pendingSubmission, Number(pendingAmount.toFixed(2)));
            setPendingSubmission(null);
        }
    };

    const handleBudgetExceedCancel = () => {
        setShowBudgetExceedDialog(false);
        setPendingSubmission(null);
    };

    const processTransaction = async (data: TransactionFormValues, originalAmount: number) => {
        if (!user) {
            return;
        }

        try {
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

            const finalType: 'expense' | 'income' | 'lend' | 'owe' =
                (type === 'expense' && (data.paymentType === 'lend' || data.paymentType === 'owe'))
                ? data.paymentType
                : type;

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
                type: finalType,
                date: data.date.toISOString(),
                note: data.note || null,
                receipt_url: receiptUrl,
            };

            const paymentTaggedNote = data.paymentType
                ? (data.paymentType === 'custom' && customCategory.trim()
                    ? `[custom] ${customCategory.trim()}${data.note ? ` ${data.note}` : ''}`.trim()
                    : `[${data.paymentType}] ${data.note || ''}`.trim())
                : (data.note || null);

            const transactionData = (type === 'income')
                ? {
                    ...baseData,
                    category_id: null,
                    card_id: null,
                    note: data.incomeSource || data.note,
                }
                : {
                    ...baseData,
                    category_id: data.paymentType
                        ? getSystemCategoryId(data.paymentType)
                        : (data.categoryId || null),
                    card_id: data.cardId || null,
                    note: paymentTaggedNote,
                };

            const { error } = await supabase.from('transactions').insert(transactionData);

            if (error) {
                throw error;
            }

            toast({ title: `${finalType.charAt(0).toUpperCase() + finalType.slice(1)} added!` });
            onSuccess();
            form.reset({
                merchant: '',
                amount: '',
                categoryId: '',
                incomeSource: '',
                date: new Date(),
                note: '',
                currency,
                cardId: '',
                paymentType: '',
            });
            setCustomCategory('');
            setReceiptUrl(null);
            setBudgetStatus(null);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast({ title: 'Error', description: message, variant: 'destructive' });
        }
    };

    const handleScanComplete = (data: { amount?: string; date?: Date; merchant?: string }) => {
        if (data.merchant) {
            form.setValue('merchant', data.merchant);
        }
        if (data.amount) {
            form.setValue('amount', data.amount);
        }
        if (data.date) {
            form.setValue('date', data.date);
        }

        if (data.merchant || data.amount || data.date) {
            toast({
                title: "Receipt Scanned",
                description: "Details auto-filled from image.",
            });
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
                            onClick={() => setType(opt.id)}
                        className={cn(
                            "flex-1 flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all card-3d",
                            type === opt.id
                                ? "border-accent bg-accent/5 ring-1 ring-accent/20 border-glow"
                                : "border-border bg-card hover:bg-muted"
                        )}
                    >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", opt.bg)}>
                            <opt.icon className={cn("w-5 h-5", opt.color, "icon-glow")} />
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", type === opt.id && "text-glow")}>{opt.name}</span>
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
                                                <Button type="button" variant="outline" className="w-20 flex items-center justify-center px-3" disabled>
                                                    <span className="font-bold">{currencyData[currencyField.value]?.symbol || '$'}</span>
                                                </Button>
                                            )
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

                    {/* Budget Suggestions - show if expense and no category selected */}
                    {type === 'expense' && !watchedCategoryId && !watchedPaymentType && (
                        <BudgetSuggestions
                            suggestions={suggestBudgets()}
                            onSelect={(categoryId) => {
                                if (categoryId) {
                                    form.setValue('categoryId', categoryId);
                                }
                            }}
                        />
                    )}

                    {/* Budget Status - show if expense with category and amount */}
                    {type === 'expense' && budgetStatus && (
                        <BudgetStatusCard status={budgetStatus} />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {type !== 'income' && (
                            <div className="space-y-2">
                                <FormField
                                    control={form.control}
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
                                {watchedPaymentType === 'custom' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Custom Category Name</Label>
                                        <Input
                                            placeholder="Enter category name..."
                                            className="rounded-xl mt-1.5"
                                            value={customCategory}
                                            onChange={(e) => setCustomCategory(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {type === 'expense' && !watchedPaymentType && (
                            <FormField
                                control={form.control}
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
                                control={form.control}
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
                                                onSelect={(date) => { field.onChange(date); setDateOpen(false); }}
                                                defaultMonth={field.value || new Date()}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </FormItem>
                            )}
                        />
                    </div>

                    {type !== 'income' && cards.length > 0 && (
                        <FormField
                            control={form.control}
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
                                    <FormMessage />
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
                            <ReceiptUpload
                                value={receiptUrl}
                                onChange={setReceiptUrl}
                                onScanComplete={handleScanComplete}
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-6 pb-2">
                        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
                            {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Record'}
                        </Button>
                    </div>
                </form>
            </Form >

            {/* Budget Exceed Confirmation Dialog */}
            {budgetStatus && (
                <BudgetExceedDialog
                    open={showBudgetExceedDialog}
                    onOpenChange={setShowBudgetExceedDialog}
                    budgetName={budgetStatus.budget?.name || budgetStatus.budget?.category?.name || 'Budget'}
                    amount={Number(watchedAmount || 0)}
                    remaining={Math.max(0, (budgetStatus.budget?.amount || 0) - (budgetStatus.budget?.spent || 0))}
                    excess={Math.abs(budgetStatus.remaining)}
                    onConfirm={handleBudgetExceedConfirm}
                    onCancel={handleBudgetExceedCancel}
                />
            )}
        </div>
    );
}
