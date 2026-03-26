import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useFirstTimeUser() {
  const { user } = useAuth();
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkIfFirstTimeUser = useCallback(async () => {
    if (!user) {
      setIsFirstTimeUser(true);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [txRes, budgetRes, savingsRes, reminderRes] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('savings_goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('payment_reminders').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      const totalRecords =
        (txRes.count || 0) +
        (budgetRes.count || 0) +
        (savingsRes.count || 0) +
        (reminderRes.count || 0);

      setIsFirstTimeUser(totalRecords === 0);
    } catch {
      setIsFirstTimeUser(true);
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
    refetch: checkIfFirstTimeUser,
  };
}
