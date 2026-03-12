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
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{goal.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {goal.percentage}% complete
                    {goal.daysLeft !== null ? ` • ${goal.daysLeft} days left` : ''}
                  </p>
                </div>
                {goal.isUrgent && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    Urgent
                  </span>
                )}
              </div>
              <Progress value={goal.percentage} className="h-2 bg-muted/30" />
            </div>
          ))}

          <div className="rounded-2xl border border-border/50 bg-muted/20 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Overall progress</span>
              <span className="font-semibold text-foreground">{overallPercentage}%</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
