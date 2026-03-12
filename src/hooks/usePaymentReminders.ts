import { useState, useEffect, useCallback } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PaymentReminder } from '@/types';
import { calculateNextDueDate } from '@/lib/recurringReminders';
import { toReminderDisplayDate } from '@/lib/reminderDate';
import { emitTransactionUpdated } from '@/lib/transaction-events';

export function usePaymentReminders() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [reminders, setReminders] = useState<PaymentReminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchReminders = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('payment_reminders')
                .select('*')
                .eq('user_id', user.id)
                .order('due_date', { ascending: true });

            if (error) throw error;
            setReminders(data as PaymentReminder[]);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Sync overdue reminders once on mount
    const syncOverdueReminders = useCallback(async () => {
        if (!user || reminders.length === 0) return;

        const overdueIds = reminders
            .filter(r => {
                const dueDate = toReminderDisplayDate(r.due_date);
                return r.status === 'upcoming' && isPast(dueDate) && !isToday(dueDate);
            })
            .map(r => r.id);

        if (overdueIds.length === 0) return;

        // Batch update to 'missed'
        await supabase
            .from('payment_reminders')
            .update({ status: 'missed' })
            .in('id', overdueIds);

        // Refresh to get updated data
        await fetchReminders();
    }, [user, reminders, fetchReminders]);

    useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    // Run overdue sync once after reminders are loaded
    useEffect(() => {
        if (reminders.length > 0) {
            void syncOverdueReminders();
        }
    }, [reminders.length, syncOverdueReminders]);

    /**
     * Find the best matching active budget for a given user + category.
     * Returns exact category match first, then total budget fallback.
     */
    const findMatchingBudgetId = useCallback(async (userId: string, categoryId: string | null): Promise<string | null> => {
        const now = new Date().toISOString();

        if (categoryId) {
            const { data } = await supabase
                .from('budgets')
                .select('id')
                .eq('user_id', userId)
                .eq('category_id', categoryId)
                .eq('is_template', false)
                .lte('start_date', now)
                .gte('end_date', now)
                .limit(1);
            if (data?.[0]?.id) return data[0].id as string;
        }

        // Fallback: total budget (category_id IS NULL)
        const { data } = await supabase
            .from('budgets')
            .select('id')
            .eq('user_id', userId)
            .is('category_id', null)
            .eq('is_template', false)
            .lte('start_date', now)
            .gte('end_date', now)
            .limit(1);
        return (data?.[0]?.id as string) ?? null;
    }, []);

    /**
     * Create an expense transaction for a paid reminder so it counts toward budgets.
     * Failure is non-fatal — the reminder update is not reverted.
     */
    const recordReminderTransaction = useCallback(async (reminder: PaymentReminder) => {
        const budgetId = await findMatchingBudgetId(reminder.user_id, reminder.category_id ?? null);

        const { error } = await supabase.from('transactions').insert({
            user_id: reminder.user_id,
            merchant: reminder.title,
            amount: reminder.amount,
            currency_base: reminder.currency || 'USD',
            type: 'expense',
            date: new Date().toISOString(),
            category_id: reminder.category_id ?? null,
            budget_id: budgetId,
            note: 'Auto-recorded from payment reminder',
        });
        if (error) {
            console.warn('Failed to record reminder transaction for budget tracking:', error.message);
        } else {
            emitTransactionUpdated();
        }
    }, [findMatchingBudgetId]);

    /**
     * Mark a reminder as paid
     * - For recurring reminders: advances due date to next occurrence
     * - For one-time reminders: marks as paid
     */
    const markAsPaid = useCallback(async (reminder: PaymentReminder) => {
        let updateData: Partial<PaymentReminder>;

        if (reminder.is_recurring && reminder.recurring_interval) {
            // Recurring: Calculate next due date and reset to "upcoming"
            const nextDueDate = calculateNextDueDate(
                reminder.due_date,
                reminder.recurring_interval as 'weekly' | 'monthly' | 'yearly'
            );

            updateData = {
                status: 'upcoming',
                due_date: nextDueDate
            };

            // Optimistic update
            setReminders(current =>
                current.map(r => r.id === reminder.id ? { ...r, ...updateData } : r)
            );

            // Persist to database
            const { error } = await supabase
                .from('payment_reminders')
                .update(updateData)
                .eq('id', reminder.id);

            if (error) {
                toast({
                    title: 'Error updating reminder',
                    description: error.message,
                    variant: 'destructive'
                });
                // Revert optimistic update
                await fetchReminders();
                return false;
            }

            toast({
                title: 'Marked as paid',
                description: `Next due: ${format(toReminderDisplayDate(nextDueDate), 'MMM dd, yyyy')}`
            });
            await recordReminderTransaction(reminder);
        } else {
            // One-time: Just mark as paid
            updateData = {
                status: 'paid'
            };

            // Optimistic update
            setReminders(current =>
                current.map(r => r.id === reminder.id ? { ...r, ...updateData } : r)
            );

            // Persist to database
            const { error } = await supabase
                .from('payment_reminders')
                .update(updateData)
                .eq('id', reminder.id);

            if (error) {
                toast({
                    title: 'Error updating reminder',
                    description: error.message,
                    variant: 'destructive'
                });
                // Revert optimistic update
                await fetchReminders();
                return false;
            }

            toast({ title: 'Marked as paid' });
            await recordReminderTransaction(reminder);
        }

        return true;
    }, [toast, fetchReminders, recordReminderTransaction]);

    const deletePaidReminder = useCallback(async (reminder: PaymentReminder) => {
        if (reminder.status !== 'paid') {
            toast({
                title: 'Only paid reminders can be deleted',
                variant: 'destructive'
            });
            return false;
        }

        const previousReminders = reminders;

        // Optimistic update
        setReminders(current => current.filter(r => r.id !== reminder.id));

        const { error } = await supabase
            .from('payment_reminders')
            .delete()
            .eq('id', reminder.id);

        if (error) {
            toast({
                title: 'Error deleting reminder',
                description: error.message,
                variant: 'destructive'
            });
            setReminders(previousReminders);
            return false;
        }

        toast({ title: 'Paid reminder deleted' });
        return true;
    }, [reminders, toast]);

    return {
        reminders,
        loading,
        error,
        refetch: fetchReminders,
        markAsPaid,
        deletePaidReminder
    };
}
