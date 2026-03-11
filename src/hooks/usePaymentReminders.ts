import { useState, useEffect, useCallback } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PaymentReminder } from '@/types';
import { calculateNextDueDate } from '@/lib/recurringReminders';
import { toReminderDisplayDate } from '@/lib/reminderDate';

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
    }, [reminders.length]); // Only depend on count to avoid infinite loop

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
        }

        return true;
    }, [toast, fetchReminders]);

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
