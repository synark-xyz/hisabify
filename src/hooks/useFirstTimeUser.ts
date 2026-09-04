import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

export function useFirstTimeUser() {
  const { user } = useAuth();
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const checkIfFirstTimeUser = useCallback(async () => {
    if (!user) {
      setIsFirstTimeUser(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [txRes, budgetRes, savingsRes, reminderRes] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('savings_goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('payment_reminders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      const failed = [txRes, budgetRes, savingsRes, reminderRes].find((r) => r.error);
      if (failed?.error) throw failed.error;

      const totalRecords =
        (txRes.count || 0) +
        (budgetRes.count || 0) +
        (savingsRes.count || 0) +
        (reminderRes.count || 0);

      setIsFirstTimeUser(totalRecords === 0);
    } catch (err) {
      // Defaulting to `true` here showed the brand-new-user getting-started screen to an
      // established user whose network merely blipped. Surface the failure instead.
      logger.error(err, { component: 'useFirstTimeUser', action: 'checkIfFirstTimeUser' });
      setError(err);
      setIsFirstTimeUser(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void checkIfFirstTimeUser();
  }, [checkIfFirstTimeUser]);

  return {
    isFirstTimeUser,
    loading,
    error,
    refetch: checkIfFirstTimeUser,
  };
}
