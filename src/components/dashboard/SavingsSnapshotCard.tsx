import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useCurrency } from '@/hooks/useCurrency';
import { useLanguage, getLanguageLocale } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface SavingsSnapshotCardProps {
  onViewAll: () => void;
  onCreateFirst: () => void;
}

export function SavingsSnapshotCard({ onViewAll, onCreateFirst }: SavingsSnapshotCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { topActiveGoals, activeGoals, totalSaved, totalTarget } = useSavingsGoals();
  const { formatAmount } = useCurrency();
  const overallPercentage = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const formatNumber = (n: number) => new Intl.NumberFormat(getLanguageLocale(language)).format(n);

  const statusBadgeStyles: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    ahead: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    on_track: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    behind: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    no_plan: 'bg-muted/10 text-muted-foreground border-muted/20',
  };

  const statusLabels: Record<string, string> = {
    completed: t('savings.status.completed'),
    ahead: t('savings.status.ahead'),
    on_track: t('savings.status.on_track'),
    behind: t('savings.status.behind'),
    no_plan: '',
  };

  return (
    <section className="rounded-xl border border-border/50 bg-card p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">{t('savingsSnapshot.title')}</h2>
          {totalTarget > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatAmount(totalSaved)} / {formatAmount(totalTarget)} {t('savingsSnapshot.saved')}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" className="rounded-lg" onClick={activeGoals.length > 0 ? onViewAll : onCreateFirst}>
          {activeGoals.length > 0 ? t('savingsSnapshot.viewAll') : t('savingsSnapshot.startFirstGoal')}
        </Button>
      </div>

      {activeGoals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
          {t('savingsSnapshot.startFirstGoal')}
        </div>
      ) : (
        <div className="space-y-4">
          {topActiveGoals.map((goal) => {
            // Hide zero-value fields for cleaner UI
            const showThisMonth = goal.thisMonthContribution > 0;
            const showReserve = goal.reserve_amount && goal.reserve_amount > 0;

            return (
              <div key={goal.id} className="rounded-xl border border-border/50 p-3 space-y-3">
                {/* Header: Goal name + Status badge */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{goal.name}</p>
                  {goal.status !== 'no_plan' && (
                    <span className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border',
                      statusBadgeStyles[goal.status] || statusBadgeStyles.no_plan
                    )}>
                      {statusLabels[goal.status]}
                    </span>
                  )}
                </div>

                {/* Progress bar - standardized 8px height with rounded caps */}
                <div className="space-y-1">
                  <Progress 
                    value={goal.percentage} 
                    className="h-2 bg-muted/30" 
                  />
                </div>

                {/* 2x2 metrics grid: Saved, Target, This Month, Reserve */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('savings.saved')}</span>
                    <span className="text-sm font-semibold text-foreground">{formatAmount(goal.current_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('savings.targetLabel')}</span>
                    <span className="text-sm font-semibold text-foreground">{formatAmount(goal.target_amount)}</span>
                  </div>
                  {showThisMonth && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('savings.thisMonth')}</span>
                      <span className="text-sm font-semibold text-foreground">{formatAmount(goal.thisMonthContribution)}</span>
                    </div>
                  )}
                  {showReserve && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('savings.reserve')}</span>
                      <span className="text-sm font-semibold text-muted-foreground">{formatAmount(goal.reserve_amount)}</span>
                    </div>
                  )}
                </div>

                {/* Deadline / Days left */}
                {goal.daysLeft !== null && (
                  <p className="text-[11px] text-muted-foreground">
                    {goal.daysLeft >= 0 
                      ? t('savings.daysLeft', { days: formatNumber(goal.daysLeft) })
                      : t('savings.pastDeadline')}
                  </p>
                )}
              </div>
            );
          })}

          {totalTarget > 0 && (
            <div className="rounded-xl border border-border/50 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('savingsSnapshot.totalSaved')}</span>
                <span className="font-semibold text-foreground">{formatAmount(totalSaved)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">{t('savingsSnapshot.totalTarget')}</span>
                <span className="font-semibold text-foreground">{formatAmount(totalTarget)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">{t('savingsSnapshot.overallProgress')}</span>
                <span className="font-semibold text-foreground">{formatNumber(overallPercentage)}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
