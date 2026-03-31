import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { getTransactionCategoryName } from '@/lib/transactionUtils';
import { cn } from '@/lib/utils';
import { PencilSimple, Trash } from '@phosphor-icons/react';

interface TransactionDetailsDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

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

export function TransactionDetailsDialog({
  transaction,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: TransactionDetailsDialogProps) {
  const { formatAmount, currency } = useCurrency();

  if (!transaction) return null;

  const isIncome = transaction.type === 'income';
  const typeInfo = TYPE_LABELS[transaction.type] ?? TYPE_LABELS.expense;
  const dateObj = new Date(transaction.date);
  const formattedDate = !isNaN(dateObj.getTime()) ? format(dateObj, 'MMMM d, yyyy') : '—';

  const originalCurrency = transaction.currency_original || transaction.currency_base || 'USD';
  const originalAmount = transaction.amount_original ?? transaction.amount;
  const originalSymbol = currencyData[originalCurrency]?.symbol || originalCurrency;
  const showOriginal = originalCurrency !== currency;

  const displayAmount = typeof transaction.amount_converted === 'number'
    ? transaction.amount_converted
    : transaction.amount;

  const categoryName = getTransactionCategoryName(transaction);

  const noteMeta = parseNoteMetaForDisplay(transaction.note);
  const cleanNote = getCleanNote(transaction.note);
  const tags = transaction.tags ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-0 gap-0 overflow-hidden">
        {/* Colored header band */}
        <div className={cn('px-6 pt-6 pb-4', isIncome ? 'bg-emerald-500/5' : 'bg-rose-500/5')}>
          <DialogHeader className="space-y-0">
            <div className="flex items-start justify-between">
              <div>
                <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', typeInfo.color)}>
                  {typeInfo.label}
                </span>
                <DialogTitle className="mt-2 text-2xl font-black tracking-tight">
                  {transaction.merchant}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-2xl font-black tracking-tighter', isIncome ? 'text-emerald-500' : 'text-rose-500')}>
                  {isIncome ? '+' : '-'}{formatAmount(Math.abs(displayAmount))}
                </p>
                {showOriginal && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {originalSymbol}{Math.abs(originalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Details body */}
        <div className="px-6 py-4 space-y-3">

          {/* Category */}
          {categoryName && categoryName !== 'Other' && (
            <Row label="Category" value={categoryName} />
          )}

          {/* Payer / Payee */}
          {noteMeta.payer && <Row label="Payer" value={noteMeta.payer} />}
          {noteMeta.payee && <Row label="Payee" value={noteMeta.payee} />}

          {/* Split With */}
          {noteMeta.splitWith && <Row label="Split with" value={noteMeta.splitWith} />}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-24 shrink-0">Tags</span>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          {transaction.status === 'uncleared' && (
            <Row label="Status" value="Uncleared" valueClassName="text-amber-500 font-bold" />
          )}

          {/* Note */}
          {cleanNote && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Note</p>
              <p className="text-sm bg-muted/50 rounded-xl px-3 py-2">{cleanNote}</p>
            </div>
          )}

          {/* Receipt image */}
          {transaction.receipt_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Receipt</p>
              <img
                src={transaction.receipt_url}
                alt="Receipt"
                className="w-full rounded-xl object-cover max-h-40 border border-border"
              />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => {
              onOpenChange(false);
              onDelete(transaction);
            }}
          >
            <Trash weight="bold" className="w-4 h-4" />
            Delete
          </Button>
          <Button
            className="flex-1 rounded-xl gap-2"
            onClick={() => {
              onOpenChange(false);
              onEdit(transaction);
            }}
          >
            <PencilSimple weight="bold" className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={cn('text-sm font-medium', valueClassName)}>{value}</span>
    </div>
  );
}
