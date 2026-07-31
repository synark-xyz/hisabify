import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PencilSimple, Trash, ChartBar, Target } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/PageShell';
import { AssignmentSheet } from '@/components/AssignmentSheet';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { DeleteTransactionDialog } from '@/components/DeleteTransactionDialog';
import { Transaction } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useBudgets } from '@/hooks/useBudgets';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { useToast } from '@/hooks/use-toast';
import { getTransactionCategoryName, computeBudgetImpact, computeGoalImpact, shouldShowMerchantPattern } from '@/lib/transactionUtils';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

/** Strip all [meta:X] prefixes from a note string for clean display */
function getCleanNote(note: string | null): string {
  return (note || '')
    .replace(/\[payer:[^\]]*\]\s*/g, '')
    .replace(/\[payee:[^\]]*\]\s*/g, '')
    .replace(/\[split_with:[^\]]*\]\s*/g, '')
    .replace(/^\[(credit_card|utility|lend|owe|custom)\]\s*/i, '')
    .trim();
}

function parseNoteMetaForDisplay(note: string | null) {
  const n = note || '';
  return {
    payer: n.match(/\[payer:([^\]]+)\]/)?.[1] ?? null,
    payee: n.match(/\[payee:([^\]]+)\]/)?.[1] ?? null,
    splitWith: n.match(/\[split_with:([^\]]+)\]/)?.[1] ?? null,
  };
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  expense: { label: 'Expense', color: 'bg-rose-500/10 text-rose-500' },
  income:  { label: 'Income',  color: 'bg-emerald-500/10 text-emerald-500' },
  lend:    { label: 'Lend',    color: 'bg-indigo-500/10 text-indigo-500' },
  owe:     { label: 'Borrow',  color: 'bg-amber-500/10 text-amber-500' },
};

export function TransactionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatAmount, currency } = useCurrency();
  const { convertAmount } = useExchangeRate();
  const { budgets } = useBudgets();
  const { activeGoals } = useSavingsGoals();
  const { recurringExpenses } = useRecurringExpenses();
  const { toast } = useToast();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignSheetOpen, setAssignSheetOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localBudgetId, setLocalBudgetId] = useState<string | null>(null);
  const [localGoalId, setLocalGoalId] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const fetchTransaction = useCallback(async () => {
    if (!user || !id) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('*, category:categories(*), card:cards!transactions_card_id_fkey(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!mountedRef.current) return;

    if (error || !data) {
      // Deleted, or not this user's row — RLS already hides other users' rows,
      // the user_id filter just makes the intent explicit.
      navigate('/transactions', { replace: true });
      return;
    }

    const tx = data as Transaction;
    setTransaction(tx);
    setLocalBudgetId(tx.budget_id ?? null);
    setLocalGoalId(tx.savings_goal_id ?? null);
    setLoading(false);
  }, [user, id, navigate]);

  useEffect(() => {
    void fetchTransaction();
  }, [fetchTransaction]);

  // Convert live, the same way ExpensesPage does for the list row. The stored
  // amount_converted column is frozen at the base currency in force when the
  // transaction was written, so reading it here makes the detail screen disagree
  // with the row the user just tapped once they switch base currency.
  useEffect(() => {
    if (!transaction) return;

    const base = transaction.currency_base || 'USD';
    const amount = Number(transaction.amount);

    if (base === currency) {
      setConvertedAmount(amount);
      return;
    }

    let cancelled = false;
    void convertAmount(amount, base, currency).then(result => {
      if (!cancelled) setConvertedAmount(result ? result.convertedAmount : amount);
    });
    return () => { cancelled = true; };
  }, [transaction, currency, convertAmount]);

  const [merchantPattern, setMerchantPattern] = useState<{
    count: number;
    total: number;
  } | null>(null);
  const [loadingPattern, setLoadingPattern] = useState(false);

  useEffect(() => {
    if (!transaction?.merchant || !user) {
      setMerchantPattern(null);
      return;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1 - 2);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 2);

    let cancelled = false;
    setLoadingPattern(true);

    void supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('merchant', transaction.merchant)
      .eq('type', transaction.type)
      .neq('id', transaction.id)
      .gte('date', monthStart.toISOString())
      .lte('date', monthEnd.toISOString())
      .then(({ data }) => {
        if (cancelled) return;
        if (data && data.length > 0) {
          const total = data.reduce((sum, t) => sum + Number(t.amount), 0);
          setMerchantPattern({ count: data.length, total });
        } else {
          setMerchantPattern({ count: 0, total: 0 });
        }
        setLoadingPattern(false);
      });

    return () => { cancelled = true; };
  }, [transaction?.merchant, transaction?.type, transaction?.id, user]);

  const matchedRecurring = useMemo<{ name: string; amount: number } | null>(() => {
    if (!transaction?.merchant) return null;
    const merchant = transaction.merchant.toLowerCase();
    const amount = Math.abs(Number(transaction.amount));
    const match = recurringExpenses.find(re => {
      const title = (re.title || '').toLowerCase();
      const titleMatch = title.includes(merchant) || merchant.includes(title);
      if (!titleMatch) return false;
      const diff = Math.abs(amount - re.amount) / re.amount;
      return diff <= 0.2;
    });
    return match ? { name: match.title, amount: match.amount } : null;
  }, [transaction?.merchant, transaction?.amount, recurringExpenses]);

  const handleAssign = useCallback(
    async (entityType: 'budget' | 'goal', entityId: string) => {
      if (!transaction) return;
      const patch =
        entityType === 'budget'
          ? { budget_id: entityId, savings_goal_id: null }
          : { budget_id: null, savings_goal_id: entityId };

      // Optimistic update
      if (entityType === 'budget') {
        setLocalBudgetId(entityId);
        setLocalGoalId(null);
      } else {
        setLocalGoalId(entityId);
        setLocalBudgetId(null);
      }

      const { error } = await supabase
        .from('transactions')
        .update(patch)
        .eq('id', transaction.id);

      if (!mountedRef.current) return;
      if (error) {
        setLocalBudgetId(transaction.budget_id ?? null);
        setLocalGoalId(transaction.savings_goal_id ?? null);
        toast({ title: t('dialogs.transactionDetails.failedUpdateLink'), variant: 'destructive' });
      }
    },
    [transaction, toast, t]
  );

  const handleUnlink = useCallback(async () => {
    if (!transaction) return;
    setLocalBudgetId(null);
    setLocalGoalId(null);

    const { error } = await supabase
      .from('transactions')
      .update({ budget_id: null, savings_goal_id: null })
      .eq('id', transaction.id);

    if (!mountedRef.current) return;
    if (error) {
      setLocalBudgetId(transaction.budget_id ?? null);
      setLocalGoalId(transaction.savings_goal_id ?? null);
      toast({ title: t('dialogs.transactionDetails.failedRemoveLink'), variant: 'destructive' });
    }
  }, [transaction, toast, t]);

  if (loading || !transaction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  const isIncome = transaction.type === 'income';
  const typeInfo = TYPE_LABELS[transaction.type] ?? TYPE_LABELS.expense;
  const dateObj = new Date(transaction.date);
  const formattedDate = !isNaN(dateObj.getTime()) ? format(dateObj, 'MMMM d, yyyy') : '—';

  const originalCurrency = transaction.currency_original || transaction.currency_base || 'USD';
  const originalAmount = transaction.amount_original ?? transaction.amount;
  const originalSymbol = currencyData[originalCurrency]?.symbol || originalCurrency;
  const showOriginal = originalCurrency !== currency;

  const displayAmount = convertedAmount ?? Number(transaction.amount);

  const categoryName = getTransactionCategoryName(transaction);
  const noteMeta = parseNoteMetaForDisplay(transaction.note);
  const cleanNote = getCleanNote(transaction.note);
  const tags = transaction.tags ?? [];

  const linkedBudget = localBudgetId ? budgets.find(b => b.id === localBudgetId) : null;
  const linkedGoal = localGoalId ? activeGoals.find(g => g.id === localGoalId) : null;

  const budgetImpact = linkedBudget
    ? computeBudgetImpact(Math.abs(displayAmount), {
        amount: linkedBudget.amount,
        spent: linkedBudget.spent,
        remaining: linkedBudget.remaining,
        percentage: linkedBudget.percentage,
        status: linkedBudget.status,
      })
    : null;

  const goalImpact = linkedGoal
    ? computeGoalImpact(Math.abs(displayAmount), {
        currentAmount: linkedGoal.current_amount,
        targetAmount: linkedGoal.target_amount,
        remaining: linkedGoal.remaining,
        percentage: linkedGoal.percentage,
      })
    : null;

  return (
    <PageShell
      title={transaction.merchant}
      backTo="/transactions"
      withBottomNav
      className="px-0 py-0"
    >
        {/* Amount band */}
        <div className={cn('px-4 pt-6 pb-6', isIncome ? 'bg-emerald-500/5' : 'bg-rose-500/5')}>
          <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', typeInfo.color)}>
            {typeInfo.label}
          </span>
          <p className={cn('mt-3 text-4xl font-black tracking-tighter', isIncome ? 'text-emerald-500' : 'text-rose-500')}>
            {isIncome ? '+' : '-'}{formatAmount(Math.abs(displayAmount))}
          </p>
          {showOriginal && (
            <p className="text-sm text-muted-foreground mt-1">
              ≈ {originalSymbol}{Math.abs(originalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">{formattedDate}</p>
        </div>

        <div className="px-4 py-5 space-y-4">
          {categoryName && categoryName !== t('transaction.categoryOther') && (
            <Row label={t('transaction.category')} value={categoryName} />
          )}
          {noteMeta.payer && <Row label="Payer" value={noteMeta.payer} />}
          {noteMeta.payee && <Row label="Payee" value={noteMeta.payee} />}
          {noteMeta.splitWith && <Row label="Split with" value={noteMeta.splitWith} />}
          {transaction.status === 'uncleared' && (
            <Row label={t('expenses.groupByStatus')} value={t('transaction.uncleared')} valueClassName="text-amber-500 font-bold" />
          )}

          {/* Linked budget or savings goal */}
          {!linkedBudget && !linkedGoal ? (
            <button
              type="button"
              onClick={() => setAssignSheetOpen(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <span>🎯</span>
              <span>{t('suggestion.linkToBudgetOrGoal')}</span>
            </button>
          ) : (
            <button
              type="button"
              aria-label="Change budget or goal assignment"
              onClick={() => setAssignSheetOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-left hover:bg-primary/10 transition-colors"
            >
              <div className="flex-shrink-0">
                {linkedBudget
                  ? <ChartBar size={20} weight="duotone" className="text-primary" />
                  : <Target size={20} weight="duotone" className="text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">
                  {linkedBudget
                    ? (linkedBudget.name || linkedBudget.category?.name || 'Budget')
                    : linkedGoal!.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {linkedBudget
                    ? t('budget.remainingUsed', {
                        remaining: formatAmount(linkedBudget.remaining),
                        percent: linkedBudget.percentage,
                      })
                    : t('savingsSnapshot.savedToGo', {
                        percent: linkedGoal!.percentage.toFixed(0),
                        remaining: formatAmount(linkedGoal!.remaining),
                      })}
                </p>
                <div className="mt-1 h-1 bg-primary/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(linkedBudget ? linkedBudget.percentage : linkedGoal!.percentage, 100)}%` }}
                  />
                </div>
              </div>
              <span aria-hidden="true" className="text-muted-foreground text-lg">›</span>
            </button>
          )}

          {/* Budget Impact */}
          {budgetImpact && (
            <div className="rounded-xl bg-primary/[0.03] border border-primary/10 p-3.5">
              <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                <span>📊</span>
                <span>{t('dialogs.transactionDetails.budgetImpact')}</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold">{formatAmount(Math.abs(displayAmount))}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="text-muted-foreground">
                  {budgetImpact.thisTxPercent.toFixed(0)}% {t('budget.ofBudget', { amount: linkedBudget!.name || linkedBudget!.category?.name || t('budget.budget') })}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('budget.spent')}: {formatAmount(linkedBudget!.spent)} ({t('budget.used', { amount: linkedBudget!.percentage.toFixed(0) })})
                {' · '}
                <span className={budgetImpact.remainingAfter < 0 ? 'text-destructive font-medium' : ''}>
                  {t('budget.left')}: {formatAmount(Math.max(0, budgetImpact.remainingAfter))}
                </span>
              </p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    budgetImpact.status === 'exceeded' ? 'bg-destructive' :
                    budgetImpact.status === 'warning' ? 'bg-yellow-500' : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(linkedBudget!.percentage + budgetImpact.thisTxPercent, 100)}%` }}
                />
              </div>
              <p className={cn(
                'text-xs mt-1',
                budgetImpact.status === 'exceeded' ? 'text-destructive' :
                budgetImpact.status === 'warning' ? 'text-yellow-500' : 'text-emerald-500'
              )}>
                {budgetImpact.status === 'exceeded' ? t('budget.statusExceeded') :
                 budgetImpact.status === 'warning' ? t('budget.statusAtRisk') : t('budget.statusPaid')}
              </p>
            </div>
          )}

          {/* Goal Impact */}
          {goalImpact && !budgetImpact && (
            <div className="rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 p-3.5">
              <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                <span>🎯</span>
                <span>{t('dialogs.transactionDetails.goalImpact')}</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold">{formatAmount(Math.abs(displayAmount))}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="text-muted-foreground">
                  {goalImpact.thisTxPercent.toFixed(0)}% {t('budget.ofBudget', { amount: linkedGoal!.name })}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('dialogs.transactionDetails.goalProgress', {
                  amount: formatAmount(linkedGoal!.current_amount),
                  percent: linkedGoal!.percentage.toFixed(0),
                  remaining: formatAmount(Math.max(0, goalImpact.remainingAfter)),
                })}
              </p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(linkedGoal!.percentage + goalImpact.thisTxPercent, 100)}%` }}
                />
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">{t('dialogs.transactionDetails.tags')}</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pattern Insights */}
          {merchantPattern && !loadingPattern && shouldShowMerchantPattern(merchantPattern.count, !!matchedRecurring) && (
            <div className="rounded-xl bg-accent/[0.03] border border-accent/10 p-3.5">
              <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                <span>📈</span>
                <span>{t('dialogs.transactionDetails.patternInsights')}</span>
              </p>
              <p className="text-sm font-medium">
                {t('dialogs.transactionDetails.merchantVisits', {
                  merchant: transaction.merchant,
                  count: merchantPattern.count + 1,
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('dialogs.transactionDetails.merchantTotal', {
                  total: formatAmount(Math.abs(merchantPattern.total) + Math.abs(displayAmount)),
                  avg: formatAmount((Math.abs(merchantPattern.total) + Math.abs(displayAmount)) / (merchantPattern.count + 1)),
                })}
              </p>
              {matchedRecurring && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('dialogs.transactionDetails.recurringMatch')} "{matchedRecurring.name}" (${matchedRecurring.amount.toFixed(2)}/mo)
                </p>
              )}
            </div>
          )}

          {cleanNote && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">{t('dialogs.transactionDetails.note')}</p>
              <p className="text-sm bg-muted/50 rounded-xl px-3 py-2.5">{cleanNote}</p>
            </div>
          )}

          {transaction.receipt_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">{t('dialogs.transactionDetails.receipt')}</p>
              <img
                src={transaction.receipt_url}
                alt="Receipt"
                className="w-full rounded-xl object-cover max-h-64 border border-border"
              />
            </div>
          )}
        </div>

        <div className="px-4 pb-8 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setDeleting(true)}
          >
            <Trash weight="bold" className="w-4 h-4" />
            {t('common.delete')}
          </Button>
          <Button className="flex-1 rounded-xl gap-2" onClick={() => setEditing(true)}>
            <PencilSimple weight="bold" className="w-4 h-4" />
            {t('common.edit')}
          </Button>
        </div>

      <AssignmentSheet
        open={assignSheetOpen}
        onOpenChange={setAssignSheetOpen}
        budgets={budgets}
        goals={activeGoals}
        currentBudgetId={localBudgetId}
        currentGoalId={localGoalId}
        onSelectBudget={budgetId => handleAssign('budget', budgetId)}
        onSelectGoal={goalId => handleAssign('goal', goalId)}
        onUnlink={handleUnlink}
      />

      <EditTransactionModal
        open={editing}
        onOpenChange={setEditing}
        transaction={transaction}
        onSuccess={() => { void fetchTransaction(); }}
      />

      <DeleteTransactionDialog
        open={deleting}
        onOpenChange={setDeleting}
        transaction={transaction}
        onSuccess={() => navigate('/transactions', { replace: true })}
      />
    </PageShell>
  );
}

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={cn('text-sm font-medium', valueClassName)}>{value}</span>
    </div>
  );
}
