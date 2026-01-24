import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PaymentReminder } from '@/types';

export function usePaymentReminders() {
    const { user } = useAuth();
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

    useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    return { reminders, loading, error, refetch: fetchReminders };
}
