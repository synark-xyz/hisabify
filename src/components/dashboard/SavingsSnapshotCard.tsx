import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useCurrency } from '@/hooks/useCurrency';

interface SavingsSnapshotCardProps {
  onViewAll: () => void;
  onCreateFirst: () => void;
}

export function SavingsSnapshotCard({ onViewAll, onCreateFirst }: SavingsSnapshotCardProps) {
  const { topActiveGoals, activeGoals, totalSaved, totalTarget } = useSavingsGoals();
  const { formatAmount } = useCurrency();
  const overallPercentage = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <section className="rounded-3xl border border-border/50 bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Savings Snapshot</h2>
          <p className="text-xs text-muted-foreground">
            {formatAmount(totalSaved)} / {formatAmount(totalTarget)} saved
          </p>
        </div>
        <Button variant="ghost" size="sm" className="rounded-xl" onClick={activeGoals.length > 0 ? onViewAll : onCreateFirst}>
          {activeGoals.length > 0 ? 'View All' : 'Start your first savings goal →'}
        </Button>
      </div>

      {activeGoals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
          Start your first savings goal →
        </div>
      ) : (
        <div className="space-y-3">
          {topActiveGoals.map((goal) => (
            <div key={goal.id} className="rounded-2xl border border-border/50 p-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{goal.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {goal.percentage}% complete
                    {goal.daysLeft !== null ? ` • ${goal.daysLeft} days left` : ''}
                  </p>
                  {goal.planEnabled && goal.requiredPerPeriod > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatAmount(goal.requiredPerPeriod)} due this {goal.periodLabel}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {goal.planEnabled && goal.paceStatus !== 'completed' && goal.paceStatus !== 'no_plan' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span className={goal.paceStatus === 'behind' ? 'h-2 w-2 rounded-full bg-amber-500' : 'h-2 w-2 rounded-full bg-emerald-500'} />
                      {goal.paceStatus === 'behind' ? 'Behind' : 'On Track'}
                    </span>
                  )}
                  {goal.isUrgent && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                      Urgent
                    </span>
                  )}
                </div>
              </div>
              <Progress value={goal.percentage} className="h-2 bg-muted/30" />
            </div>
          ))}

          <div className="rounded-2xl border border-border/50 bg-muted/20 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total saved</span>
              <span className="font-semibold text-foreground">{formatAmount(totalSaved)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Total target</span>
              <span className="font-semibold text-foreground">{formatAmount(totalTarget)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Overall progress</span>
              <span className="font-semibold text-foreground">{overallPercentage}%</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
