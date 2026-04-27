import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ChevronDown, AlertTriangle } from 'lucide-react';
import { BaseModalSheet, SheetBackdrop, SheetContainer, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetFooter, SheetScroller } from '@/components/ui/base-modal-sheet';
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
import { useAnalytics } from '@/hooks/useAnalytics';
import { useExchangeRate } from '@/hooks/useExchangeRate';
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
  const { logEvent } = useAnalytics();
  const currencySymbol = currencyData[currency]?.symbol || '$';

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

  useEffect(() => {
    if (!watchedAmount || !currency) return;

    const checkIncome = async () => {
      if (incomeCheckTimer.current) clearTimeout(incomeCheckTimer.current);

      incomeCheckTimer.current = setTimeout(async () => {
        try {
          const amountNum = parseFloat(watchedAmount);
          if (isNaN(amountNum) || amountNum <= 0) {
            setIncomeWarning(null);
            return;
          }

          const amountInDefaultCurrency = amountNum;
          const incomeData = await supabase
            .from('monthly_income')
            .select('amount, currency')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (incomeData.data) {
            const incomeAmount = incomeData.data.currency === currency
              ? incomeData.data.amount
              : await convertAmount(incomeData.data.amount, incomeData.data.currency, currency);

            const percentUsed = (amountInDefaultCurrency / incomeAmount) * 100;

            if (percentUsed > 80) {
              setIncomeWarning(`This budget is ${percentUsed.toFixed(0)}% of your monthly income`);
            } else {
              setIncomeWarning(null);
            }
          }
        } catch (err) {
          console.error('Error checking income:', err);
        }
      }, 500);
    };

    checkIncome();

    return () => {
      if (incomeCheckTimer.current) clearTimeout(incomeCheckTimer.current);
    };
  }, [watchedAmount, currency, user, convertAmount]);

  const onSubmit = async (data: BudgetFormData) => {
    if (!user) return;
    setLoading(true);

    try {
      logEvent('budget_submit', { has_category: !!data.categoryId });

      const budgetData = {
        user_id: user.id,
        category_id: data.categoryId || null,
        amount: parseFloat(data.amount),
        currency: currency,
        period_type: data.periodType,
        start_date: format(data.startDate, 'yyyy-MM-dd'),
        end_date: data.isContinuous ? null : (data.endDate ? format(data.endDate, 'yyyy-MM-dd') : null),
        name: data.name || null,
        is_recurring: data.isRecurring,
        alert_enabled: data.alertEnabled,
        alert_threshold: data.alertEnabled ? data.alertThreshold : null,
      };

      if (editingBudget) {
        await updateBudget(editingBudget.id, budgetData);
      } else {
        await createBudget(budgetData);
      }

      logEvent(editingBudget ? 'budget_update_success' : 'budget_create_success');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving budget:', error);
      logEvent('budget_submit_error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === 'expense');

  return (
    <BaseModalSheet open={open} onOpenChange={onOpenChange} snapPoints={[1, 0.6]}>
      <SheetBackdrop onClick={() => onOpenChange(false)} />
      <SheetContainer>
        <SheetHeader>
          <SheetTitle>{editingBudget ? t('budget.editBudget') : t('budget.addBudget')}</SheetTitle>
          <SheetClose />
        </SheetHeader>
        <SheetScroller>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 px-4 pt-2">
                {/* Category */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                        {t('budget.category')}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder={t('budget.selectCategory')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">{t('budget.allCategories')}</SelectItem>
                          {filteredCategories.map((cat) => (
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

                {/* Budget Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                        {t('budget.budgetName')}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t('budget.budgetNamePlaceholder')} {...field} className="h-12" />
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
                      <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                        {t('budget.amount')}
                      </FormLabel>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          {currencySymbol}
                        </span>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            placeholder="0.00"
                            className="h-12 pl-10 font-mono text-lg"
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
                        {t('budget.period')}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
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

                {/* Start Date */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                        {t('budget.startDate')}
                      </FormLabel>
                      <DateSelect value={field.value} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Continuous toggle */}
                <FormField
                  control={form.control}
                  name="isContinuous"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
                        <div>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70 cursor-pointer">
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
                          <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70 cursor-pointer">
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
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>50%</span>
                            <span>100%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </form>
            </Form>
        </SheetScroller>
        <SheetFooter>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              className="flex-1"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBudget ? t('budget.updateBudget') : t('budget.addBudget')}
            </Button>
          </div>
        </SheetFooter>
      </SheetContainer>
    </BaseModalSheet>
  );
}
