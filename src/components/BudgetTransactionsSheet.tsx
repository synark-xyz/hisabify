import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BaseModalSheet, SheetBackdrop, SheetContainer, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetScroller } from '@/components/ui/base-modal-sheet';
import { TransactionItem } from '@/components/TransactionItem';
import { BudgetWithSpending } from '@/hooks/useBudgets';
import { useCurrency } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types';

interface BudgetTransactionsSheetProps {
  budget: BudgetWithSpending | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ConvertedTransaction extends Transaction {
  convertedAmount: number;
}

export function BudgetTransactionsSheet({ budget, open, onOpenChange }: BudgetTransactionsSheetProps) {
  const [transactions, setTransactions] = useState<ConvertedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const { user } = useAuth();
  const { currency, formatAmount } = useCurrency();
  const { convertAmount } = useExchangeRate();

  const fetchTransactions = useCallback(async () => {
    if (!budget || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(*), card:cards(*)')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('budget_id', budget.id)
        .order('date', { ascending: false });
      if (error || !data) return;

      const converted = await Promise.all(
        (data as Transaction[]).map(async (tx) => {
          const stored = tx.currency_base || 'USD';
          if (stored === currency) {
            return { ...tx, convertedAmount: Number(tx.amount) };
          }
          const result = await convertAmount(Number(tx.amount), stored, currency);
          return {
            ...tx,
            convertedAmount: result ? result.convertedAmount : Number(tx.amount),
          };
        })
      );

      setTransactions(converted);
    } finally {
      setLoading(false);
    }
  }, [budget, user, currency, convertAmount]);

  useEffect(() => {
    if (open && budget) {
      void fetchTransactions();
    } else {
      setTransactions([]);
    }
  }, [open, budget, fetchTransactions]);

  const periodLabel = budget
    ? `${budget.start_date ? format(new Date(budget.start_date), 'MMM d') : ''} – ${budget.end_date ? format(new Date(budget.end_date), 'MMM d, yyyy') : ''}`
    : '';

  const budgetName = budget?.category?.name || budget?.name || 'Total Budget';

  const totalSpent = transactions.reduce((sum, tx) => sum + tx.convertedAmount, 0);

  return (
    <BaseModalSheet open={open} onOpenChange={onOpenChange}>
      <SheetBackdrop onClick={() => onOpenChange(false)} />
      <SheetContainer className="z-[10001]">
        <SheetHeader>
          <SheetTitle>{budgetName}</SheetTitle>
          <SheetClose />
        </SheetHeader>
        <SheetContent>
          <SheetScroller>
            <div className="space-y-4 px-1">
              {/* Period + summary */}
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                <span className="text-xs text-muted-foreground">{periodLabel}</span>
                <span className="text-xs font-semibold text-foreground">
                  {t('budget.totalBudgetSpent', { amount: formatAmount(totalSpent) })}
                </span>
              </div>

              {/* Transaction list */}
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      transaction={tx}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Receipt className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">{t('budget.noExpensesInPeriod')}</p>
                </div>
              )}
            </div>
          </SheetScroller>
        </SheetContent>
      </SheetContainer>
    </BaseModalSheet>
  );
}
