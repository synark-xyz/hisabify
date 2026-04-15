import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BaseModalSheet, SheetBackdrop, SheetContainer, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/base-modal-sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Archive,
  ArrowRightLeft,
  Calendar,
  Edit,
  MoreVertical,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';
import { PremiumGuard } from '@/components/PremiumGuard';
import { cn } from '@/lib/utils';
import { localizeNumber } from '@/lib/i18nNumber';
import { GoalThermometer } from './GoalThermometer';
import { SavingsFundingDialog } from './SavingsFundingDialog';
import { GoalCompletionModal } from './GoalCompletionModal';
import { SavingsGoalWithProgress } from '@/hooks/useSavingsGoals';

interface SavingsGoalCardProps {
  goal: SavingsGoalWithProgress;
  mainBalance: number;
  otherActiveGoals: SavingsGoalWithProgress[];
  onEdit: (goal: SavingsGoalWithProgress) => void;
  onDelete: (id: string) => void;
  onAddFunds: (id: string, amount: number, budgetId?: string | null) => void;
  onArchive: (id: string) => void;
  onRedeployToBalance: (id: string, amount: number) => void;
  onRedeployToGoal: (sourceGoalId: string, destinationGoalId: string, amount: number) => void;
  onBudgetTransfer: (budgetId: string, goalId: string, amount: number) => void;
  onUpdateDeadline: (goalId: string, deadline: string) => void;
  linkedBudgetName?: string;
  defaultFundingTab?: 'manual' | 'budget';
  defaultBudgetId?: string | null;
  autoOpenFunding?: boolean;
}

export function SavingsGoalCard({
  goal,
  mainBalance,
  otherActiveGoals,
  onEdit,
  onDelete,
  onAddFunds,
  onArchive,
  onRedeployToBalance,
  onRedeployToGoal,
  onBudgetTransfer,
  onUpdateDeadline,
  linkedBudgetName,
  defaultFundingTab,
  defaultBudgetId,
  autoOpenFunding = false,
}: SavingsGoalCardProps) {
  const [showFunding, setShowFunding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRedeploy, setShowRedeploy] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [redeployTargetId, setRedeployTargetId] = useState<string>('');
  const [redeployAmount, setRedeployAmount] = useState(goal.availableToRedeploy.toString());
  const { formatAmount } = useCurrency();
  const previousStatusRef = useRef(goal.status);
  const celebrationTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const statusColors = {
    completed: 'text-green-500',
    on_track: 'text-green-600',
    ahead: 'text-green-600',
    behind: 'text-amber-600',
    no_plan: 'text-muted-foreground',
  };

  const { t } = useTranslation();

  const statusLabels = {
    completed: t('savings.status.completed'),
    on_track: t('savings.status.on_track'),
    ahead: t('savings.status.ahead'),
    behind: t('savings.status.behind'),
    no_plan: t('savings.status.no_plan'),
  };

  const chartData = goal.contributionHistory
    .filter((entry) => entry.type === 'contribution')
    .map((entry) => ({
      date: format(new Date(entry.date), 'MMM d'),
      total: entry.runningTotal,
      target: goal.requiredPerPeriod,
    }));

  const sparklineData = goal.sparkline.map((entry) => ({
    label: entry.label,
    amount: entry.amount,
    target: entry.target,
  }));

  const paceToneClass = goal.paceStatus === 'behind'
    ? 'text-amber-600 bg-amber-500/10 border-amber-500/20'
    : 'text-green-600 bg-emerald-500/10 border-emerald-500/20';

  useEffect(() => {
    if (autoOpenFunding) {
      setShowFunding(true);
    }
  }, [autoOpenFunding]);

  useEffect(() => {
    if (previousStatusRef.current !== 'completed' && goal.status === 'completed') {
      setShowCelebration(true);
      if (celebrationTimerRef.current) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    }

    previousStatusRef.current = goal.status;

    return () => {
      if (celebrationTimerRef.current) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, [goal.status]);

  return (
    <>
      <Card className="overflow-visible border-border/50 bg-card/50 backdrop-blur-sm group hover:shadow-lg transition-all duration-300 card-3d">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: `${goal.color}15` }}
              >
                <Target className="w-5 h-5 icon-glow" style={{ color: goal.color }} />
              </div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-tight">{goal.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {goal.status !== 'no_plan' && (
                    <span className={cn('text-[10px] font-black uppercase tracking-widest', statusColors[goal.status])}>
                      {statusLabels[goal.status]}
                    </span>
                  )}
                  {goal.isUrgent && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                      {t('savings.dueSoon')}
                    </span>
                  )}
                  {linkedBudgetName && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                      <Wallet className="w-2.5 h-2.5" />
                      {linkedBudgetName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {goal.status !== 'completed' ? (
                  <DropdownMenuItem onClick={() => setShowFunding(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('savings.addFunds')}
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => onArchive(goal.id)}>
                      <Archive className="mr-2 h-4 w-4" />
                      {t('savings.archiveGoal')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowRedeploy(true)}>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      {t('savings.redeployFunds')}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => onEdit(goal)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('savings.editGoal')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('savings.deleteGoal')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl h-10">
              <TabsTrigger value="overview" className="rounded-xl text-[10px] font-bold uppercase tracking-wider">
                {t("savings.overview")}
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl text-[10px] font-bold uppercase tracking-wider">
                {t("savings.history")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
                  {goal.status === 'completed' && (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-700">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <p className="text-xs font-semibold">{t('savings.goalCompleted')}</p>
                </div>
              )}

              <div className="flex items-center gap-5">
                <GoalThermometer percentage={goal.percentage} color={goal.color} size="sm" />

                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>{t('savings.progress')}</span>
                      <span className="text-foreground">{goal.percentage}%</span>
                    </div>
                    <Progress
                      value={goal.percentage}
                      className="h-1.5 bg-muted/30"
                      style={{ '--progress-background': goal.color } as CSSProperties}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('savings.saved')}</p>
                      <p className="text-sm font-black text-foreground">{formatAmount(goal.current_amount)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('savings.targetLabel')}</p>
                      <p className="text-sm font-black text-foreground/70">{formatAmount(goal.target_amount)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('savings.thisMonth')}</p>
                      <p className="text-sm font-black text-foreground/70">{formatAmount(goal.thisMonthContribution)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('savings.reserve')}</p>
                      <p className="text-sm font-black text-foreground/70">{formatAmount(goal.reserve_amount || 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {goal.deadline && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {goal.daysLeft !== null && goal.daysLeft >= 0
                            ? t('savings.daysLeft', { days: localizeNumber(goal.daysLeft) })
                            : format(new Date(goal.deadline), 'MMM d')}
                        </span>
                      </div>
                    )}

                    {!goal.isArchived && goal.status !== 'completed' && (
                      <Button
                        size="sm"
                        className="h-8 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs"
                        onClick={() => setShowFunding(true)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {t('savings.funds')}
                      </Button>
                    )}
                  </div>

                  {goal.status === 'completed' ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('savings.readyToRedeploy')}</span>
                        <span className="font-semibold text-foreground">{formatAmount(goal.availableToRedeploy)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-muted-foreground">{t('savings.completedAt')}</span>
                        <span className="font-semibold text-foreground">
                          {format(new Date(goal.completed_at || goal.updated_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/50 bg-muted/20 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('savings.projectedCompletion')}</span>
                        <span className="font-semibold text-foreground">
                          {goal.suggestedDeadline
                            ? format(new Date(goal.suggestedDeadline), 'MMM d, yyyy')
                            : goal.projectedCompletionLabel || t('savings.needsMoreData')}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-muted-foreground">{t('savings.autoContribute')}</span>
                        <span className="font-semibold text-foreground">
                          {goal.auto_contribute_enabled
                            ? `${formatAmount(goal.auto_contribute_amount || 0)} / ${goal.auto_contribute_frequency}`
                            : t('savings.off')}
                        </span>
                      </div>
                    </div>
                  )}

                  {goal.planEnabled && goal.status !== 'completed' && (
                    <div className="space-y-3 rounded-2xl border border-border/50 bg-muted/10 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('savings.requiredThis', { period: goal.periodLabel })}</span>
                        <span className="font-semibold text-foreground">{formatAmount(goal.requiredPerPeriod)}</span>
                      </div>

                      {goal.paceStatus !== 'completed' && (
                        <div className={cn('rounded-xl border px-3 py-2', paceToneClass)}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">
                              {goal.paceStatus === 'ahead' ? t('savings.paceAhead') : goal.paceStatus === 'behind' ? t('savings.paceBehind') : t('savings.paceOnTrack')}
                            </span>
                            <span>{formatAmount(goal.currentPeriodAmount)}</span>
                          </div>
                          <p className="mt-1 text-[11px]">
                            {goal.paceStatus === 'behind'
                              ? t('savings.neededThis', { amount: formatAmount(goal.requiredPerPeriod), period: goal.periodLabel })
                              : t('savings.dueThis', { amount: formatAmount(goal.requiredPerPeriod), period: goal.periodLabel })}
                          </p>
                        </div>
                      )}

                      {sparklineData.length > 0 && (
                        <div className="h-20">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sparklineData}>
                              <XAxis dataKey="label" hide />
                              <YAxis hide />
                              <Tooltip
                                formatter={(value: number, name: string) => [formatAmount(value), name === 'target' ? t('savings.chartRequired') : t('savings.chartSaved')]}
                                labelFormatter={(label) => label}
                              />
                              <ReferenceLine y={goal.requiredPerPeriod} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                              <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} />
                              <Line type="monotone" dataKey="amount" stroke={goal.color} strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {goal.paceStatus === 'behind' && goal.suggestedDeadline && (
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-amber-700">
                          <span>{t('savings.paceAtThis', { date: format(new Date(goal.suggestedDeadline), 'MMM d, yyyy') })}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 rounded-lg px-2 text-[11px] font-bold text-amber-700 hover:text-amber-800"
                            onClick={() => onUpdateDeadline(goal.id, goal.suggestedDeadline!)}
                          >
                            {t('savings.updateDeadline')}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <PremiumGuard featureName="Savings History">
                <div className="space-y-4">
                  <div className="h-32 rounded-2xl border border-border/50 bg-muted/10 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <Tooltip />
                        {goal.planEnabled && goal.requiredPerPeriod > 0 && (
                          <ReferenceLine y={goal.requiredPerPeriod} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                        )}
                        {goal.planEnabled && goal.requiredPerPeriod > 0 && (
                          <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} />
                        )}
                        <Line type="monotone" dataKey="total" stroke={goal.color} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    {goal.contributionHistory.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
                        {t('savings.noContributions')}
                      </p>
                    ) : (
                      goal.contributionHistory.slice().reverse().map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-border/50 p-3 text-sm">
                          <div>
                            <p className="font-semibold text-foreground">{format(new Date(entry.date), 'MMM d, yyyy')}</p>
                            <p className="text-xs text-muted-foreground">{entry.note || goal.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">{formatAmount(entry.amount)}</p>
                            <p className="text-xs text-muted-foreground">{t('savings.totalLabel', { amount: formatAmount(entry.runningTotal) })}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {goal.missedMonths.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
                      {t('savings.missedMonths', { periods: goal.periodLabelPlural, months: goal.missedMonths.join(', ')})}
                    </div>
                  )}
                </div>
              </PremiumGuard>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <GoalCompletionModal
        goal={goal}
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
      />

      <SavingsFundingDialog
        open={showFunding}
        onOpenChange={setShowFunding}
        goal={goal}
        mainBalance={mainBalance}
        onManualSubmit={(amount) => onAddFunds(goal.id, amount)}
        onBudgetTransfer={(budgetId, amount) => onBudgetTransfer(budgetId, goal.id, amount)}
        defaultTab={defaultFundingTab}
        defaultBudgetId={defaultBudgetId}
      />

      <BaseModalSheet open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <SheetBackdrop onClick={() => setShowDeleteConfirm(false)} />
        <SheetContainer className="z-[10000]">
          <SheetHeader>
            <SheetTitle>{t('savings.deleteConfirmTitle', { name: goal.name })}</SheetTitle>
            <SheetClose onClick={() => setShowDeleteConfirm(false)} />
          </SheetHeader>
          <SheetContent>
            <div className="space-y-4 px-1 pb-4">
              <p className="text-sm text-muted-foreground">
                {t('savings.deleteConfirmDesc')}
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" className="flex-1 rounded-2xl font-bold" onClick={() => setShowDeleteConfirm(false)}>
                  {t('savings.cancel')}
                </Button>
                <Button
                  className="flex-1 rounded-2xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    onDelete(goal.id);
                    setShowDeleteConfirm(false);
                  }}
                >
                  {t('savings.delete')}
                </Button>
              </div>
            </div>
          </SheetContent>
        </SheetContainer>
      </BaseModalSheet>

      <BaseModalSheet open={showRedeploy} onOpenChange={setShowRedeploy}>
        <SheetBackdrop onClick={() => setShowRedeploy(false)} />
        <SheetContainer>
          <SheetHeader>
            <SheetTitle>{t('savings.redeployTitle', { name: goal.name })}</SheetTitle>
            <SheetClose onClick={() => setShowRedeploy(false)} />
          </SheetHeader>
          <SheetContent>
            <div className="space-y-4 px-1 pb-4">
              <div className="rounded-2xl border border-border/50 bg-muted/20 p-3 text-sm">
                <p className="flex items-center justify-between">
                  <span>{t('savings.available')}</span>
                  <span className="font-semibold text-foreground">{formatAmount(goal.availableToRedeploy)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`redeploy-${goal.id}`}>{t('savings.amount')}</Label>
                <Input
                  id={`redeploy-${goal.id}`}
                  type="number"
                  value={redeployAmount}
                  onChange={(event) => setRedeployAmount(event.target.value)}
                  min="0"
                  max={goal.availableToRedeploy}
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`target-${goal.id}`}>{t('savings.moveToAnotherGoal')}</Label>
                <select
                  id={`target-${goal.id}`}
                  className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  value={redeployTargetId}
                  onChange={(event) => setRedeployTargetId(event.target.value)}
                >
                  <option value="">{t('savings.returnToMainBalance')}</option>
                  {otherActiveGoals.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="ghost" className="flex-1 rounded-2xl font-bold" onClick={() => setShowRedeploy(false)}>
                  {t('savings.cancel')}
                </Button>
                <Button
                  className="flex-1 rounded-2xl font-bold"
                  onClick={() => {
                    const amount = Number(redeployAmount);
                    if (amount <= 0) {
                      return;
                    }

                    if (redeployTargetId) {
                      onRedeployToGoal(goal.id, redeployTargetId, amount);
                    } else {
                      onRedeployToBalance(goal.id, amount);
                    }
                    setShowRedeploy(false);
                  }}
                >
                  {redeployTargetId ? (
                    <>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      {t('savings.moveFunds')}
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      {t('savings.returnFunds')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SheetContent>
        </SheetContainer>
      </BaseModalSheet>
    </>
  );
}
