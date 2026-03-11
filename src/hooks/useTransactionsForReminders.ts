import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Transaction } from '@/types';

interface TransactionForReminder extends Transaction {
  category?: {
    name: string;
    icon: string;
    color: string;
  } | null;
}

/**
 * Hook to fetch recent transactions that don't have payment reminders set.
 * These transactions can be used to quickly create reminders with auto-filled data.
 */
export function useTransactionsForReminders() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionForReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactionsWithoutReminders = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch recent expense transactions (last 60 days) with categories
      const { data: recentTransactions, error: txError } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()) // Last 60 days
        .order('date', { ascending: false })
        .limit(50);

      if (txError) throw txError;

      if (!recentTransactions || recentTransactions.length === 0) {
        setTransactions([]);
        return;
      }

      // Fetch all existing reminders to filter out transactions that already have reminders
      const { data: existingReminders, error: remindersError } = await supabase
        .from('payment_reminders')
        .select('title, amount')
        .eq('user_id', user.id);

      if (remindersError) throw remindersError;

      // Create a Set of unique reminder identifiers (title + amount combo)
      const reminderKeys = new Set(
        (existingReminders || []).map(r => `${r.title.toLowerCase().trim()}-${r.amount}`)
      );

      // Filter out transactions that already have reminders
      // Match by merchant name and amount
      const transactionsWithoutReminders = recentTransactions.filter(tx => {
        const key = `${tx.merchant.toLowerCase().trim()}-${tx.amount}`;
        return !reminderKeys.has(key);
      });

      console.log('[useTransactionsForReminders] Fetched:', {
        total: recentTransactions.length,
        withoutReminders: transactionsWithoutReminders.length,
        filtered: recentTransactions.length - transactionsWithoutReminders.length
      });

      setTransactions(transactionsWithoutReminders as TransactionForReminder[]);
    } catch (err) {
      console.error('[useTransactionsForReminders] Error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch transactions'));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactionsWithoutReminders();
  }, [fetchTransactionsWithoutReminders]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactionsWithoutReminders
  };
}
