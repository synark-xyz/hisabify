import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateSelect } from '@/components/ui/date-select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useBudgets, PeriodType, Budget } from '@/hooks/useBudgets';
import { Category } from '@/types';
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
});

type BudgetFormData = z.infer<typeof budgetFormSchema>;

interface AddBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBudget?: Budget | null;
  onSuccess?: () => void;
}

export function AddBudgetModal({ open, onOpenChange, editingBudget, onSuccess }: AddBudgetModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);


  const { currency } = useCurrency();
  const { createBudget, updateBudget } = useBudgets();
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
    },
  });

  const watchedPeriodType = form.watch('periodType');

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (editingBudget) {
        form.reset({
          categoryId: editingBudget.category_id || 'all',
          amount: editingBudget.amount.toString(),
          periodType: editingBudget.period_type as PeriodType,
          startDate: editingBudget.start_date ? new Date(editingBudget.start_date) : startOfMonth(new Date()),
          endDate: editingBudget.end_date ? new Date(editingBudget.end_date) : endOfMonth(new Date()),
          name: editingBudget.name || '',
        });
      } else {
        form.reset({
          categoryId: 'all',
          amount: '',
          periodType: 'monthly',
          startDate: startOfMonth(new Date()),
          endDate: endOfMonth(new Date()),
          name: '',
        });
      }
    }
  }, [open, editingBudget, form]);

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

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data as Category[]);
  };

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-bold">
            {editingBudget ? 'Edit Budget' : 'Create Budget'}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Budget Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly Groceries" {...field} />
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
                  <FormLabel>Category (Optional - leave empty for total budget)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
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
                  <FormLabel>Budget Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {currencySymbol}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8"
                        {...field}
                      />
                    </div>
                  </FormControl>
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
                  <FormLabel>Budget Period</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
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
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <DateSelect
                      label="Start Date"
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
                    <DateSelect
                      label="End Date"
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBudget ? 'Update Budget' : 'Create Budget'}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
