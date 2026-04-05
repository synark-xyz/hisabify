import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useCurrency } from '@/hooks/useCurrency';
import { useLanguage, getLanguageLocale } from '@/hooks/useLanguage';

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

  return (
    <section className="rounded-3xl border border-border/50 bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">{t('savingsSnapshot.title')}</h2>
          <p className="text-xs text-muted-foreground">
            {formatAmount(totalSaved)} / {formatAmount(totalTarget)} {t('savingsSnapshot.saved')}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="rounded-xl" onClick={activeGoals.length > 0 ? onViewAll : onCreateFirst}>
          {activeGoals.length > 0 ? t('savingsSnapshot.viewAll') : t('savingsSnapshot.startFirstGoal')}
        </Button>
      </div>

      {activeGoals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
          {t('savingsSnapshot.startFirstGoal')}
        </div>
      ) : (
        <div className="space-y-3">
          {topActiveGoals.map((goal) => (
            <div key={goal.id} className="rounded-2xl border border-border/50 p-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{goal.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('savingsSnapshot.percentComplete', { percent: formatNumber(goal.percentage) })}
                    {goal.daysLeft !== null ? ` • ${t('savingsSnapshot.daysLeft', { days: formatNumber(goal.daysLeft) })}` : ''}
                  </p>
                  {goal.planEnabled && goal.requiredPerPeriod > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatAmount(goal.requiredPerPeriod)} {t('savingsSnapshot.dueThisPeriod', { period: goal.periodLabel })}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {goal.planEnabled && goal.paceStatus !== 'completed' && goal.paceStatus !== 'no_plan' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span className={goal.paceStatus === 'behind' ? 'h-2 w-2 rounded-full bg-amber-500' : 'h-2 w-2 rounded-full bg-emerald-500'} />
                      {goal.paceStatus === 'behind' ? t('savingsSnapshot.behind') : t('savingsSnapshot.onTrack')}
                    </span>
                  )}
                  {goal.isUrgent && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                      {t('savingsSnapshot.urgent')}
                    </span>
                  )}
                </div>
              </div>
              <Progress value={goal.percentage} className="h-2 bg-muted/30" />
            </div>
          ))}

          <div className="rounded-2xl border border-border/50 bg-muted/20 p-3 text-xs">
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
        </div>
      )}
    </section>
  );
}
