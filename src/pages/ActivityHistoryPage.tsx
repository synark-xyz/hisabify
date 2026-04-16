import { useEffect, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import type { ActivityLog } from '@/types';
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
  LayoutGrid,
} from 'lucide-react';
import { useActivityLog } from '@/hooks/useActivityLog';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const activityIcons: Record<string, { icon: React.ElementType; bg: string; fg: string }> = {
  transaction_added: { icon: ArrowUpRight, bg: 'bg-rose-500/10', fg: 'text-rose-500' },
  transaction_updated: { icon: Edit3, bg: 'bg-amber-500/10', fg: 'text-amber-500' },
  transaction_deleted: { icon: Trash2, bg: 'bg-gray-500/10', fg: 'text-gray-500' },
  debt_created: { icon: Plus, bg: 'bg-rose-500/10', fg: 'text-rose-500' },
  debt_settled: { icon: CheckCircle2, bg: 'bg-emerald-500/10', fg: 'text-emerald-500' },
  debt_updated: { icon: Edit3, bg: 'bg-amber-500/10', fg: 'text-amber-500' },
  debt_deleted: { icon: Trash2, bg: 'bg-gray-500/10', fg: 'text-gray-500' },
  budget_created: { icon: Wallet, bg: 'bg-blue-500/10', fg: 'text-blue-500' },
  budget_updated: { icon: Edit3, bg: 'bg-amber-500/10', fg: 'text-amber-500' },
  budget_deleted: { icon: Trash2, bg: 'bg-gray-500/10', fg: 'text-gray-500' },
  savings_goal_created: { icon: HandCoins, bg: 'bg-purple-500/10', fg: 'text-purple-500' },
  savings_contribution: { icon: HandCoins, bg: 'bg-emerald-500/10', fg: 'text-emerald-500' },
  savings_goal_completed: { icon: CheckCircle2, bg: 'bg-emerald-500/10', fg: 'text-emerald-500' },
  savings_goal_archived: { icon: Archive, bg: 'bg-gray-500/10', fg: 'text-gray-500' },
  payment_reminder_created: { icon: Bell, bg: 'bg-blue-500/10', fg: 'text-blue-500' },
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
  return format(date, 'MMMM d, yyyy');
}

function ActivityItem({ activity }: { activity: ActivityLog }) {
  const iconConfig = activityIcons[activity.activity_type] || { icon: Clock, bg: 'bg-gray-500/10', fg: 'text-gray-500' };
  const Icon = iconConfig.icon;

  return (
    <div className="flex gap-3 p-3 hover:bg-muted/50 rounded-xl transition-colors">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', iconConfig.bg)}>
        <Icon className={cn('w-5 h-5', iconConfig.fg)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{activity.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {format(new Date(activity.created_at), 'h:mm a')}
          </span>
          {activity.amount && (
            <span className="text-xs font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
              {activity.currency} {activity.amount.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityGroup({ dateStr, activities, t }: { dateStr: string; activities: ActivityLog[]; t: TFunction }) {
  return (
    <div className="space-y-2">
      <div className="sticky top-0 bg-background py-2 z-10">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {formatDateHeader(dateStr, t)}
        </h3>
      </div>
      <div className="space-y-1">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

export function ActivityHistoryPage() {
  const { activities, loading } = useActivityLog();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const groupedByDate = activities.reduce((acc, activity) => {
    const date = new Date(activity.created_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>);

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3 flex-nowrap">
          <button onClick={() => navigate('/more')} className="p-2 -ml-2 hover:bg-accent/10 rounded-lg shrink-0">
            <LayoutGrid className="w-5 h-5 text-accent" />
          </button>
          <h1 className="text-lg font-semibold truncate">{t('activity.activityHistory')}</h1>
        </div>
      </div>
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">{t('activity.title')}</span>
          <span className="text-sm text-muted-foreground">
            {activities.length} {t('activity.activitiesRecorded')}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">{t('activity.noActivityYet')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('activity.noActivityDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <ActivityGroup
                key={date}
                dateStr={date}
                activities={groupedByDate[date]}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
