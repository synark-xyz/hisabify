import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TransactionItem } from '@/components/TransactionItem';
import { EditTransactionModal } from '@/components/EditTransactionModal';
import { DeleteTransactionDialog } from '@/components/DeleteTransactionDialog';
import { isToday, isYesterday } from 'date-fns';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  CreditCard,
  Clock,
  Wallet,
  Trash2,
  CheckCircle2,
  Plus,
  Edit3,
  FileText,
  Bell,
  Archive,
} from 'lucide-react';
import type { ActivityLog, Transaction } from '@/types';
import { useActivityHistory } from '@/hooks/useActivityHistory';
import { formatActivityDescription, type ActivityFeedEntry } from '@/lib/activityFeed';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/formatDate';
import { localizeNumber } from '@/lib/i18nNumber';

const activityIcons: Record<string, { icon: React.ElementType; bg: string; fg: string }> = {
  transaction_added: { icon: ArrowUpRight, bg: 'bg-rose-500/10', fg: 'text-rose-500' },
  transaction_updated: { icon: Edit3, bg: 'bg-amber-500/10', fg: 'text-amber-500' },
  transaction_deleted: { icon: Trash2, bg: 'bg-gray-500/10', fg: 'text-gray-500' },
  debt_created: { icon: Plus, bg: 'bg-rose-500/10', fg: 'text-rose-500' },
  debt_settled: { icon: CheckCircle2, bg: 'bg-emerald-500/10', fg: 'text-emerald-500' },
  debt_updated: { icon: Edit3, bg: 'bg-amber-500/10', fg: 'text-amber-500' },
  debt_deleted: { icon: Trash2, bg: 'bg-gray-500/10', fg: 'text-gray-500' },
  budget_created: { icon: Wallet, bg: 'bg-primary/10', fg: 'text-primary' },
  budget_updated: { icon: Edit3, bg: 'bg-amber-500/10', fg: 'text-amber-500' },
  budget_deleted: { icon: Trash2, bg: 'bg-gray-500/10', fg: 'text-gray-500' },
  savings_goal_created: { icon: HandCoins, bg: 'bg-purple-500/10', fg: 'text-purple-500' },
  savings_contribution: { icon: HandCoins, bg: 'bg-emerald-500/10', fg: 'text-emerald-500' },
  savings_goal_completed: { icon: CheckCircle2, bg: 'bg-emerald-500/10', fg: 'text-emerald-500' },
  savings_goal_archived: { icon: Archive, bg: 'bg-gray-500/10', fg: 'text-gray-500' },
  payment_reminder_created: { icon: Bell, bg: 'bg-primary/10', fg: 'text-primary' },
  payment_reminder_paid: { icon: CheckCircle2, bg: 'bg-emerald-500/10', fg: 'text-emerald-500' },
  payment_reminder_deleted: { icon: Trash2, bg: 'bg-gray-500/10', fg: 'text-gray-500' },
  card_added: { icon: CreditCard, bg: 'bg-indigo-500/10', fg: 'text-indigo-500' },
  card_updated: { icon: Edit3, bg: 'bg-amber-500/10', fg: 'text-amber-500' },
  card_deleted: { icon: Trash2, bg: 'bg-gray-500/10', fg: 'text-gray-500' },
  recurring_expense_created: { icon: Clock, bg: 'bg-orange-500/10', fg: 'text-orange-500' },
  recurring_expense_updated: { icon: Edit3, bg: 'bg-amber-500/10', fg: 'text-amber-500' },
  recurring_expense_deleted: { icon: Trash2, bg: 'bg-gray-500/10', fg: 'text-gray-500' },
};

function formatDateHeader(dateStr: string, t: TFunction): string {
  const date = new Date(dateStr);
  if (isToday(date)) return t('common.today');
  if (isYesterday(date)) return t('common.yesterday');
  return formatDate(date, 'MMMM d, yyyy');
}

function ActivityItem({ activity, t }: { activity: ActivityLog; t: TFunction }) {
  const iconConfig = activityIcons[activity.activity_type] || { icon: Clock, bg: 'bg-gray-500/10', fg: 'text-gray-500' };
  const Icon = iconConfig.icon;

  const description = formatActivityDescription(activity.description, t);

  return (
    <div className="flex gap-3 p-3 hover:bg-muted/50 rounded-xl transition-colors">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', iconConfig.bg)}>
        <Icon className={cn('w-5 h-5', iconConfig.fg)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDate(new Date(activity.created_at), 'h:mm a')}
          </span>
          {activity.amount && (
            <span className="text-xs font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
              {activity.currency} {localizeNumber(activity.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface FeedGroupProps {
  dateStr: string;
  entries: ActivityFeedEntry[];
  t: TFunction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onViewDetails: (transaction: Transaction) => void;
  revealedId: string | null;
  onReveal: (id: string | null) => void;
}

function FeedGroup({ dateStr, entries, t, onEdit, onDelete, onViewDetails, revealedId, onReveal }: FeedGroupProps) {
  return (
    <div className="space-y-2">
      <div className="sticky top-0 bg-background py-2 z-10">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {formatDateHeader(dateStr, t)}
        </h3>
      </div>
      <div className="space-y-2">
        {entries.map((entry) =>
          entry.kind === 'transaction' ? (
            <TransactionItem
              key={entry.tx.id}
              transaction={entry.tx}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
              revealedId={revealedId}
              onReveal={onReveal}
            />
          ) : (
            <ActivityItem key={entry.activity.id} activity={entry.activity} t={t} />
          ),
        )}
      </div>
    </div>
  );
}

export function ActivityHistoryPage() {
  const { feed, loading, refetch } = useActivityHistory();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [revealedTransactionId, setRevealedTransactionId] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const sortedDates = useMemo(() => {
    const groups = new Map<string, ActivityFeedEntry[]>();
    for (const entry of feed) {
      const date = new Date(entry.at).toDateString();
      const bucket = groups.get(date);
      if (bucket) bucket.push(entry);
      else groups.set(date, [entry]);
    }
    // feed is already newest-first, so insertion order is the display order.
    return Array.from(groups.entries());
  }, [feed]);

  return (
    <PageShell title="activity.activityHistory" backTo="/more" withBottomNav className="px-0 py-0">
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{t('activity.title')}</span>
          <span className="text-sm text-muted-foreground">
            {localizeNumber(feed.length)} {t('activity.activitiesRecorded')}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">{t('activity.noActivityYet')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('activity.noActivityDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(([date, entries]) => (
              <FeedGroup
                key={date}
                dateStr={date}
                entries={entries}
                t={t}
                onEdit={setEditingTransaction}
                onDelete={setDeletingTransaction}
                onViewDetails={(transaction) => navigate(`/transactions/${transaction.id}`)}
                revealedId={revealedTransactionId}
                onReveal={setRevealedTransactionId}
              />
            ))}
          </div>
        )}
      </div>

      <EditTransactionModal
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
        onSuccess={() => { void refetch(); }}
      />

      <DeleteTransactionDialog
        open={!!deletingTransaction}
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
        transaction={deletingTransaction}
        onSuccess={() => { void refetch(); }}
      />
    </PageShell>
  );
}
