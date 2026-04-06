import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ChevronDown, AlertTriangle } from 'lucide-react';
import { MobileDialog } from '@/components/ui/mobile-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DateSelect } from '@/components/ui/date-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useBudgets, PeriodType, Budget } from '@/hooks/useBudgets';
import { useUserBehavior } from '@/hooks/useUserBehavior';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useKeyboardHandler } from '@/hooks/useKeyboardHandler';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

const budgetFormSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be a positive number'),
  periodType: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.date(),
  endDate: z.date().optional(),
  name: z.string().optional(),
  currency: z.string().default('USD'),
  isRecurring: z.boolean().default(false),
  isContinuous: z.boolean().default(false),
  alertEnabled: z.boolean().default(true),
  alertThreshold: z.number().min(50).max(100).default(80),
}).superRefine((data, ctx) => {
  if (!data.isContinuous && !data.endDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date is required', path: ['endDate'] });
  }
});

type BudgetFormData = z.infer<typeof budgetFormSchema>;

interface AddBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBudget?: Budget | null;
  onSuccess?: () => void;
}

export function AddBudgetModal({ open, onOpenChange, editingBudget, onSuccess }: AddBudgetModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [incomeWarning, setIncomeWarning] = useState<string | null>(null);
  const incomeCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { currency } = useCurrency();
  const { user } = useAuth();
  const { convertAmount } = useExchangeRate();
  const { isPremium } = useSubscription();
  const { createBudget, updateBudget, budgets } = useBudgets();
  const { categories } = useCategories();
  const { logEvent } = useUserBehavior();
  const currencySymbol = currencyData[currency]?.symbol || '$';

  // Handle keyboard on mobile
  useKeyboardHandler(open);

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      categoryId: '',
      amount: '',
      periodType: 'monthly',
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
      name: '',
      currency: currency,
      isRecurring: false,
      isContinuous: false,
      alertEnabled: true,
      alertThreshold: 80,
    },
  });

  const watchedPeriodType = form.watch('periodType');
  const watchedIsContinuous = form.watch('isContinuous');

  useEffect(() => {
    if (open) {
      if (editingBudget) {
        form.reset({
          categoryId: editingBudget.category_id || 'all',
          amount: editingBudget.amount.toString(),
          periodType: editingBudget.period_type as PeriodType,
          startDate: editingBudget.start_date ? new Date(editingBudget.start_date) : startOfMonth(new Date()),
          endDate: editingBudget.end_date ? new Date(editingBudget.end_date) : endOfMonth(new Date()),
          name: editingBudget.name || '',
          currency: currency,
          isRecurring: editingBudget.is_recurring || false,
          isContinuous: !editingBudget.end_date,
          alertEnabled: editingBudget.alert_enabled ?? true,
          alertThreshold: editingBudget.alert_threshold ?? 80,
        });
      } else {
        form.reset({
          categoryId: 'all',
          amount: '',
          periodType: 'monthly',
          startDate: startOfMonth(new Date()),
          endDate: endOfMonth(new Date()),
          name: '',
          currency: currency,
          isRecurring: false,
          isContinuous: false,
          alertEnabled: true,
          alertThreshold: 80,
        });
      }
      setIncomeWarning(null);
    }
  }, [open, editingBudget, form, currency]);

  // Auto-calculate end date when period type changes (skip for continuous budgets)
  useEffect(() => {
    if (watchedIsContinuous) return;
    const startDate = form.getValues('startDate');
    if (!startDate) return;

    let newEndDate: Date;
    switch (watchedPeriodType) {
      case 'weekly':
        newEndDate = endOfWeek(startDate, { weekStartsOn: 1 });
        break;
      case 'monthly':
        newEndDate = endOfMonth(startDate);
        break;
      case 'yearly':
        newEndDate = endOfYear(startDate);
        break;
      default:
        newEndDate = endOfMonth(startDate);
    }
    form.setValue('endDate', newEndDate);
  }, [watchedPeriodType, watchedIsContinuous, form]);

  // Watch amount to trigger income validation
  const watchedAmount = form.watch('amount');
  const watchedStartDate = form.watch('startDate');
  const watchedEndDate = form.watch('endDate');

  useEffect(() => {
    if (incomeCheckTimer.current) clearTimeout(incomeCheckTimer.current);
    const amountNum = parseFloat(watchedAmount);
    if (!user || !watchedStartDate || !watchedEndDate || isNaN(amountNum) || amountNum <= 0) {
      setIncomeWarning(null);
      return;
    }

    incomeCheckTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('transactions')
          .select('amount, currency_base')
          .eq('user_id', user.id)
          .eq('type', 'income')
          .gte('date', watchedStartDate.toISOString())
          .lte('date', watchedEndDate.toISOString());

        let totalIncome = 0;
        for (const t of data || []) {
          const stored = t.currency_base || 'USD';
          if (stored === currency) {
            totalIncome += Number(t.amount);
          } else {
            const result = await convertAmount(Number(t.amount), stored, currency);
            totalIncome += result ? result.convertedAmount : Number(t.amount);
          }
        }

        // Sum of existing budgets for this period (excluding the one being edited)
        const existingTotal = budgets
          .filter((b) => b.id !== editingBudget?.id)
          .reduce((sum, b) => sum + b.amount, 0);

        const symbol = currencyData[currency]?.symbol || '$';
        if (totalIncome > 0 && existingTotal + amountNum > totalIncome) {
          setIncomeWarning(
            `Total budgeted (${symbol}${(existingTotal + amountNum).toLocaleString(undefined, { maximumFractionDigits: 0 })}) exceeds your income for this period (${symbol}${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}).`
          );
        } else {
          setIncomeWarning(null);
        }
      } catch {
        setIncomeWarning(null);
      }
    }, 400);

    return () => {
      if (incomeCheckTimer.current) clearTimeout(incomeCheckTimer.current);
    };
  }, [watchedAmount, watchedStartDate, watchedEndDate, user, currency, convertAmount, budgets, editingBudget]);

  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return;
    form.setValue('startDate', date);
    if (watchedIsContinuous) return;

    // Auto-calculate end date based on period type
    let newEndDate: Date;
    switch (watchedPeriodType) {
      case 'weekly':
        newEndDate = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case 'monthly':
        newEndDate = endOfMonth(date);
        break;
      case 'yearly':
        newEndDate = endOfYear(date);
        break;
      default:
        newEndDate = endOfMonth(date);
    }
    form.setValue('endDate', newEndDate);
  };

  const onSubmit = async (data: BudgetFormData) => {
    setLoading(true);

    try {
      if (editingBudget) {
        await updateBudget({
          id: editingBudget.id,
          category_id: data.categoryId === 'all' ? null : (data.categoryId || null),
          amount: parseFloat(data.amount),
          period_type: data.periodType,
          start_date: data.startDate,
          end_date: data.isContinuous ? null : data.endDate,
          name: data.name,
          is_recurring: data.isRecurring,
          alert_enabled: data.alertEnabled,
          alert_threshold: data.alertThreshold,
        });
      } else {
        await createBudget({
          category_id: data.categoryId === 'all' ? null : (data.categoryId || null),
          amount: parseFloat(data.amount),
          period_type: data.periodType,
          start_date: data.startDate,
          end_date: data.isContinuous ? null : data.endDate,
          name: data.name,
          is_recurring: data.isRecurring,
          alert_enabled: data.alertEnabled,
          alert_threshold: data.alertThreshold,
        });
      }

      onSuccess?.();
      onOpenChange(false);

      // Log budget_set behavior event (not for edits)
      if (!editingBudget) {
        const category = categories.find(c => c.id === (data.categoryId === 'all' ? null : data.categoryId));
        logEvent('budget_set', {
          category: category?.name || 'all',
          period: data.periodType,
          amount: parseFloat(data.amount),
          currency: data.currency,
        }).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingBudget ? t('budget.editBudget') : t('budget.addBudget')}
      className="z-[10000]"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Budget Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {t('budget.budgetNameOptional')}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t('budget.budgetNamePlaceholder')} className="rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {t('budget.category')}
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={t('budget.allCategories')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">{t('budget.allCategories')}</SelectItem>
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

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {t('budget.budgetAmount')}
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field: currencyField }) => (
                          isPremium ? (
                            <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-20 flex items-center justify-between px-3"
                                >
                                  <span className="font-bold">
                                    {currencyData[currencyField.value]?.symbol || '$'}
                                  </span>
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
                              <span className="font-bold">
                                {currencyData[currencyField.value]?.symbol || '$'}
                              </span>
                            </Button>
                          )
                        )}
                      />
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={t('common.amountPlaceholder')}
                          className="rounded-xl flex-1"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Period Type */}
              <FormField
                control={form.control}
                name="periodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {t('budget.budgetPeriod')}
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">{t('budget.weekly')}</SelectItem>
                        <SelectItem value="monthly">{t('budget.monthly')}</SelectItem>
                        <SelectItem value="yearly">{t('budget.yearly')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date Range */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {t('budget.startDate')}
                    </FormLabel>
                    <DateSelect
                      value={field.value}
                      onChange={(date) => {
                        handleStartDateChange(date);
                      }}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Continuous toggle — hides End Date */}
              <FormField
                control={form.control}
                name="isContinuous"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
                      <div>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                          {t('budget.continuous')}
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('budget.continuousDesc')}
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {/* End Date — hidden when Continuous is on */}
              {!watchedIsContinuous && (
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                        {t('budget.endDate')}
                      </FormLabel>
                      <DateSelect value={field.value} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Income warning */}
              {incomeWarning && (
                <div className="flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{incomeWarning}</span>
                </div>
              )}

              {/* Auto-renew toggle */}
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
                      <div>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                          {t('budget.autoRenewEachPeriod')}
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('budget.autoRenewDesc')}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Alert Settings Section */}
              <div className="space-y-3 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {t('budget.budgetAlerts')}
                    </FormLabel>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('budget.budgetAlertsDesc')}
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="alertEnabled"
                    render={({ field }) => (
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    )}
                  />
                </div>

                {/* Alert Threshold Slider - only show when alerts are enabled */}
                {form.watch('alertEnabled') && (
                  <FormField
                    control={form.control}
                    name="alertThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
<FormLabel className="text-xs text-muted-foreground">
                              {t('budget.alertAt')}
                            </FormLabel>
                          <span className="text-sm font-bold text-accent">
                            {field.value}%
                          </span>
                        </div>
                        <FormControl>
                          <input
                            type="range"
                            min="50"
                            max="100"
                            step="10"
                            value={field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                          />
                        </FormControl>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingBudget ? t('budget.updateBudget') : t('budget.addBudget')}
                </Button>
              </div>
          </form>
        </Form>
    </MobileDialog>
  );
}
