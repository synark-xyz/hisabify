import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ChevronDown } from 'lucide-react';
import { MobileDialog } from '@/components/ui/mobile-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateSelect } from '@/components/ui/date-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { useBudgets, PeriodType, Budget } from '@/hooks/useBudgets';
import { useKeyboardHandler } from '@/hooks/useKeyboardHandler';
import { useCategories } from '@/hooks/useCategories';
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
  endDate: z.date(),
  name: z.string().optional(),
  currency: z.string().default('USD'),
});

type BudgetFormData = z.infer<typeof budgetFormSchema>;

interface AddBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBudget?: Budget | null;
  onSuccess?: () => void;
}

export function AddBudgetModal({ open, onOpenChange, editingBudget, onSuccess }: AddBudgetModalProps) {
  const [loading, setLoading] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const { currency } = useCurrency();
  const { isPremium } = useSubscription();
  const { createBudget, updateBudget } = useBudgets();
  const { categories } = useCategories();
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
    },
  });

  const watchedPeriodType = form.watch('periodType');

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
        });
      }
    }
  }, [open, editingBudget, form, currency]);

  // Auto-calculate end date when period type changes
  useEffect(() => {
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
  }, [watchedPeriodType, form]);

  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return;

    form.setValue('startDate', date);

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
          end_date: data.endDate,
          name: data.name,
        });
      } else {
        await createBudget({
          category_id: data.categoryId === 'all' ? null : (data.categoryId || null),
          amount: parseFloat(data.amount),
          period_type: data.periodType,
          start_date: data.startDate,
          end_date: data.endDate,
          name: data.name,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingBudget ? 'Edit Budget' : 'Create Budget'}
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
                      Budget Name (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly Groceries" className="rounded-xl" {...field} />
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
                      Category
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
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
                      Budget Amount
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
                          placeholder="0.00"
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
                      Budget Period
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
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
                      Start Date
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

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      End Date
                    </FormLabel>
                    <DateSelect value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingBudget ? 'Update Budget' : 'Create Budget'}
                </Button>
              </div>
          </form>
        </Form>
    </MobileDialog>
  );
}
