import { useEffect, useState, type CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileDialog } from '@/components/ui/mobile-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';
import { PremiumGuard } from '@/components/PremiumGuard';
import { cn } from '@/lib/utils';
import { GoalThermometer } from './GoalThermometer';
import { SavingsFundingDialog } from './SavingsFundingDialog';
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
  defaultFundingTab,
  defaultBudgetId,
  autoOpenFunding = false,
}: SavingsGoalCardProps) {
  const [showFunding, setShowFunding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRedeploy, setShowRedeploy] = useState(false);
  const [redeployTargetId, setRedeployTargetId] = useState<string>('');
  const [redeployAmount, setRedeployAmount] = useState(goal.availableToRedeploy.toString());
  const { formatAmount } = useCurrency();

  const statusColors = {
    completed: 'text-green-500',
    on_track: 'text-accent',
    at_risk: 'text-amber-500',
    behind: 'text-rose-500',
  };

  const statusLabels = {
    completed: 'Completed',
    on_track: 'On Track',
    at_risk: 'At Risk',
    behind: 'Behind',
  };

  const chartData = goal.contributionHistory
    .filter((entry) => entry.type === 'contribution')
    .map((entry) => ({
      date: format(new Date(entry.date), 'MMM d'),
      total: entry.runningTotal,
    }));

  useEffect(() => {
    if (autoOpenFunding) {
      setShowFunding(true);
    }
  }, [autoOpenFunding]);

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
                  <span className={cn('text-[10px] font-black uppercase tracking-widest', statusColors[goal.status])}>
                    {statusLabels[goal.status]}
                  </span>
                  {goal.isUrgent && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                      Due Soon
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
                    Add Funds
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => onArchive(goal.id)}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archive Goal
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowRedeploy(true)}>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Redeploy Funds
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => onEdit(goal)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Goal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl h-10">
              <TabsTrigger value="overview" className="rounded-xl text-[10px] font-bold uppercase tracking-wider">
                Overview
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl text-[10px] font-bold uppercase tracking-wider">
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {goal.status === 'completed' && (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-700">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  <p className="text-xs font-semibold">Goal completed. Archive it or redeploy the funds.</p>
                </div>
              )}

              <div className="flex items-center gap-5">
                <GoalThermometer percentage={goal.percentage} color={goal.color} size="sm" />

                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Progress</span>
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
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saved</p>
                      <p className="text-sm font-black text-foreground">{formatAmount(goal.current_amount)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target</p>
                      <p className="text-sm font-black text-foreground/70">{formatAmount(goal.target_amount)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">This Month</p>
                      <p className="text-sm font-black text-foreground/70">{formatAmount(goal.thisMonthContribution)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reserve</p>
                      <p className="text-sm font-black text-foreground/70">{formatAmount(goal.reserve_amount || 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {goal.deadline && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {goal.daysLeft !== null && goal.daysLeft >= 0
                            ? `${goal.daysLeft} d left`
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
                        Funds
                      </Button>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border/50 bg-muted/20 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Projected completion</span>
                      <span className="font-semibold text-foreground">{goal.projectedCompletionLabel || 'Needs more data'}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-muted-foreground">Auto-contribute</span>
                      <span className="font-semibold text-foreground">
                        {goal.auto_contribute_enabled
                          ? `${formatAmount(goal.auto_contribute_amount || 0)} / ${goal.auto_contribute_frequency}`
                          : 'Off'}
                      </span>
                    </div>
                  </div>
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
                        <Line type="monotone" dataKey="total" stroke={goal.color} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2">
                    {goal.contributionHistory.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
                        No contributions yet.
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
                            <p className="text-xs text-muted-foreground">Total {formatAmount(entry.runningTotal)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {goal.missedMonths.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
                      Missed months: {goal.missedMonths.join(', ')}
                    </div>
                  )}
                </div>
              </PremiumGuard>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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

      <MobileDialog
        className="z-[10000]"
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={`Delete "${goal.name}"?`}
        maxWidth="max-w-[400px]"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. This will permanently delete your savings goal and its progress.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1 rounded-2xl font-bold" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-2xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(goal.id);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </MobileDialog>

      <MobileDialog
        open={showRedeploy}
        onOpenChange={setShowRedeploy}
        title={`Redeploy "${goal.name}"`}
        maxWidth="max-w-[400px]"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-3 text-sm">
            <p className="flex items-center justify-between">
              <span className="text-muted-foreground">Available</span>
              <span className="font-semibold text-foreground">{formatAmount(goal.availableToRedeploy)}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`redeploy-${goal.id}`}>Amount</Label>
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
            <Label htmlFor={`target-${goal.id}`}>Move to another goal</Label>
            <select
              id={`target-${goal.id}`}
              className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              value={redeployTargetId}
              onChange={(event) => setRedeployTargetId(event.target.value)}
            >
              <option value="">Return to main balance</option>
              {otherActiveGoals.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1 rounded-2xl font-bold" onClick={() => setShowRedeploy(false)}>
              Cancel
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
                  Move Funds
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Return Funds
                </>
              )}
            </Button>
          </div>
        </div>
      </MobileDialog>
    </>
  );
}
