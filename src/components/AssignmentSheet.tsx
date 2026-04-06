import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { BudgetWithSpending } from '@/hooks/useBudgets';
import type { SavingsGoalWithProgress } from '@/hooks/useSavingsGoals';
import { cn } from '@/lib/utils';
import { ChartBar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/hooks/useCurrency';

interface AssignmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgets: BudgetWithSpending[];
  goals: SavingsGoalWithProgress[];
  currentBudgetId: string | null;
  currentGoalId: string | null;
  onSelectBudget: (budgetId: string) => void;
  onSelectGoal: (goalId: string) => void;
  onUnlink: () => void;
}

export function AssignmentSheet({
  open,
  onOpenChange,
  budgets,
  goals,
  currentBudgetId,
  currentGoalId,
  onSelectBudget,
  onSelectGoal,
  onUnlink,
}: AssignmentSheetProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();
  const hasSelection = currentBudgetId !== null || currentGoalId !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh] overflow-y-auto pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">{t('suggestion.sheetTitle')}</SheetTitle>
        </SheetHeader>

        {budgets.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {t('suggestion.budgets')}
            </p>
            <div className="space-y-2">
              {budgets.map(budget => {
                const isLinked = budget.id === currentBudgetId;
                return (
                  <button
                    key={budget.id}
                    onClick={() => {
                      onSelectBudget(budget.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors',
                      isLinked
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-muted/40 hover:bg-muted/70'
                    )}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <ChartBar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{budget.name || budget.category?.name || 'Budget'}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('budget.remainingUsed', { remaining: formatAmount(budget.remaining), percent: budget.percentage })}
                      </p>
                      <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            budget.status === 'exceeded' ? 'bg-destructive' :
                            budget.status === 'warning' ? 'bg-yellow-500' : 'bg-primary'
                          )}
                          style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    {isLinked && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex-shrink-0">
                        {t('suggestion.linked')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {goals.filter(g => !g.isArchived && g.percentage < 100).length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {t('suggestion.savingsGoals')}
            </p>
            <div className="space-y-2">
              {goals
                .filter(g => !g.isArchived && g.percentage < 100)
                .map(goal => {
                  const isLinked = goal.id === currentGoalId;
                  return (
                    <button
                      key={goal.id}
                      onClick={() => {
                        onSelectGoal(goal.id);
                        onOpenChange(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors',
                        isLinked
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-muted/40 hover:bg-muted/70'
                      )}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                        style={{ backgroundColor: `${goal.color}22` }}
                      >
                        {goal.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{goal.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('savingsSnapshot.savedToGo', { percent: goal.percentage.toFixed(0), remaining: formatAmount(goal.remaining) })}
                        </p>
                        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      {isLinked && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex-shrink-0">
                          {t('suggestion.linked')}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {hasSelection && (
          <button
            onClick={() => {
              onUnlink();
              onOpenChange(false);
            }}
            className="w-full p-3 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-center"
          >
            {t('suggestion.removeLink')}
          </button>
        )}

        {budgets.length === 0 && goals.filter(g => !g.isArchived).length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {t('suggestion.noBudgetsOrGoals')}
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
