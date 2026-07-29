import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { RecurringExpense, RecurringFrequency } from '@/types';

/**
 * Materialise any templates now due for the signed-in user.
 *
 * Standalone so the app root can call it without mounting the full list hook. The RPC
 * is idempotent and scopes itself to `auth.uid()`, so calling it on every app open is
 * both safe and the reason a stalled cron cannot silently skip a cycle.
 */
export async function processRecurringExpenses(): Promise<number> {
  // Functions are not in the generated types (Functions is `never`), so the result is
  // cast — same pattern as ensure_savings_categories in src/lib/savings.ts.
  const { data, error } = await supabase.rpc('process_recurring_expenses');
  if (error) {
    // Non-fatal: the nightly cron is the primary path, this is only the catch-up.
    console.warn('[recurring] process_recurring_expenses failed:', error.message);
    return 0;
  }
  const rows = data as Array<{ created: number; templates: number }> | null;
  return rows?.[0]?.created ?? 0;
}

export type RecurringExpenseInput = {
  title: string;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  next_due_date: string;
  category_id?: string | null;
  card_id?: string | null;
  note?: string | null;
};

/**
 * CRUD over `recurring_expenses` templates.
 *
 * Materialisation lives entirely in Postgres (`process_recurring_expenses()`), so this
 * hook never creates transactions itself — it calls the RPC and refetches. The RPC scopes
 * itself to `auth.uid()`, so the client cannot touch another user's templates even though
 * the function is SECURITY DEFINER.
 */
export function useRecurringExpenses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecurringExpenses = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('next_due_date', { ascending: true });

      if (error) throw error;
      setRecurringExpenses((data ?? []) as RecurringExpense[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchRecurringExpenses();
  }, [fetchRecurringExpenses]);

  const createRecurringExpense = useCallback(async (input: RecurringExpenseInput) => {
    if (!user) return false;

    const { error } = await supabase.from('recurring_expenses').insert({
      user_id: user.id,
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      frequency: input.frequency,
      // start_date anchors the template; next_due_date is the moving cursor the RPC advances.
      start_date: input.next_due_date,
      next_due_date: input.next_due_date,
      category_id: input.category_id ?? null,
      card_id: input.card_id ?? null,
      note: input.note ?? null,
    });

    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return false;
    }

    await fetchRecurringExpenses();
    return true;
  }, [user, toast, fetchRecurringExpenses]);

  const updateRecurringExpense = useCallback(
    async (id: string, patch: Partial<RecurringExpenseInput & { is_active: boolean }>) => {
      const previous = recurringExpenses;
      setRecurringExpenses(current =>
        current.map(r => (r.id === id ? { ...r, ...patch } as RecurringExpense : r))
      );

      const { error } = await supabase.from('recurring_expenses').update(patch).eq('id', id);

      if (error) {
        setRecurringExpenses(previous);
        toast({ title: 'Could not update', description: error.message, variant: 'destructive' });
        return false;
      }

      await fetchRecurringExpenses();
      return true;
    },
    [recurringExpenses, toast, fetchRecurringExpenses]
  );

  const deleteRecurringExpense = useCallback(async (id: string) => {
    const previous = recurringExpenses;
    setRecurringExpenses(current => current.filter(r => r.id !== id));

    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);

    if (error) {
      setRecurringExpenses(previous);
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      return false;
    }

    // Transactions already created from this template are deliberately left alone —
    // they record money that was actually spent.
    toast({ title: 'Recurring expense deleted' });
    return true;
  }, [recurringExpenses, toast]);

  /** Materialise anything now due. Safe to call repeatedly — the RPC is idempotent. */
  const runNow = useCallback(async () => {
    if (!user) return 0;

    const created = await processRecurringExpenses();
    if (created > 0) await fetchRecurringExpenses();
    return created;
  }, [user, fetchRecurringExpenses]);

  return {
    recurringExpenses,
    loading,
    error,
    refetch: fetchRecurringExpenses,
    createRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    runNow,
  };
}
