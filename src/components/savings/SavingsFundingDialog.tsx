import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowUpRight, PartyPopper } from 'lucide-react';
import { MobileDialog } from '@/components/ui/mobile-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBudgetContext } from '@/hooks/useBudgetContext';
import { useCurrency } from '@/hooks/useCurrency';
import { SavingsGoalWithProgress } from '@/hooks/useSavingsGoals';

interface SavingsFundingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: SavingsGoalWithProgress;
  mainBalance: number;
  onManualSubmit: (amount: number) => void;
  onBudgetTransfer: (budgetId: string, amount: number) => void;
  defaultTab?: 'manual' | 'budget';
  defaultBudgetId?: string | null;
}

export function SavingsFundingDialog({
  open,
  onOpenChange,
  goal,
  mainBalance,
  onManualSubmit,
  onBudgetTransfer,
  defaultTab = 'manual',
  defaultBudgetId = null,
}: SavingsFundingDialogProps) {
  const { t } = useTranslation();
  const { budgets } = useBudgetContext();
  const { formatAmount, currencySymbol } = useCurrency();
  const [tab, setTab] = useState<'manual' | 'budget'>(defaultTab);
  const [manualAmount, setManualAmount] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(defaultBudgetId);

  const selectedBudget = useMemo(
    () => budgets.find((budget) => budget.id === selectedBudgetId) || null,
    [budgets, selectedBudgetId]
  );

  const projectedBalance = mainBalance - Number(manualAmount || 0);
  const projectedGoalAmount = goal.current_amount + Number(manualAmount || 0);
  const completesGoal = Number(manualAmount || 0) > 0 && projectedGoalAmount >= goal.target_amount;
  const budgetTransferCap = Math.min(goal.remaining, selectedBudget?.remaining || 0);
  const budgetEnded = !!selectedBudget?.end_date && new Date(selectedBudget.end_date) < new Date();

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setSelectedBudgetId(defaultBudgetId);
    }
  }, [defaultBudgetId, defaultTab, open]);

  return (
    <MobileDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('savings.topUp', { name: goal.name })}
      className="z-[10000]"
      maxWidth="max-w-[420px]"
    >
      <Tabs value={tab} onValueChange={(value) => setTab(value as 'manual' | 'budget')} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl h-11">
          <TabsTrigger value="manual" className="rounded-xl text-xs font-bold uppercase tracking-wider">
            {t('savings.addFunds')}
          </TabsTrigger>
          <TabsTrigger value="budget" className="rounded-xl text-xs font-bold uppercase tracking-wider">
            {t('savings.fromBudget')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Contribution
            </Label>
            <div className="relative">
              <Input
                id="manual-amount"
                type="number"
                placeholder={t('common.amountPlaceholder')}
                className="pl-8 h-12 rounded-2xl font-bold text-lg"
                value={manualAmount}
                onChange={(event) => setManualAmount(event.target.value)}
                min="0"
                step="0.01"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                {currencySymbol}
              </span>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/50 bg-muted/30 p-3">
            <p className="text-xs font-medium flex justify-between">
              <span>{t('savings.currentBalance')}</span>
              <span className="font-bold">{formatAmount(mainBalance)}</span>
            </p>
            <p className="text-xs font-medium flex justify-between">
              <span>{t('savings.balanceAfter')}</span>
              <span className="font-bold">{formatAmount(projectedBalance)}</span>
            </p>
            <p className="text-xs font-medium flex justify-between">
              <span>{t('savings.projectedSaved')}</span>
              <span className="font-bold">{formatAmount(projectedGoalAmount)}</span>
            </p>
            <p className="text-xs font-medium flex justify-between">
              <span>{t('savings.projectedCompletion')}</span>
              <span className="font-bold">{goal.projectedCompletionLabel || t('savings.needsMoreData')}</span>
            </p>
          </div>

          {Number(manualAmount || 0) > mainBalance && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <p className="text-xs font-medium">
                {t('savings.exceedsBalance', { amount: formatAmount(mainBalance) })}
              </p>
            </div>
          )}

          {completesGoal && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-700">
              <PartyPopper className="h-4 w-4" />
              <p className="text-xs font-semibold">{t('savings.goalCompletes')}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1 rounded-2xl font-bold" onClick={() => onOpenChange(false)}>
              {t('savings.cancel')}
            </Button>
            <Button
              className="flex-1 rounded-2xl font-bold bg-accent hover:bg-accent/90 shadow-fab"
              onClick={() => {
                const amount = Number(manualAmount);
                if (amount > 0) {
                  onManualSubmit(amount);
                  setManualAmount('');
                  onOpenChange(false);
                }
              }}
            >
              {t('savings.addFunds')}
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('savings.budget')}
            </Label>
            <Select value={selectedBudgetId || undefined} onValueChange={setSelectedBudgetId}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder={t('savings.selectBudget')} />
              </SelectTrigger>
              <SelectContent>
                {budgets.filter((budget) => budget.remaining > 0).map((budget) => (
                  <SelectItem key={budget.id} value={budget.id}>
                    {(budget.category?.name || budget.name || t('savings.budget')) + ` (${formatAmount(budget.remaining)})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBudget && (
            <div className="space-y-2 rounded-2xl border border-border/50 bg-muted/30 p-3">
              <p className="text-xs font-medium flex justify-between">
                <span>{t('savings.budgetRemaining')}</span>
                <span className="font-bold">{formatAmount(selectedBudget.remaining)}</span>
              </p>
              <p className="text-xs font-medium flex justify-between">
                <span>{t('savings.goalRemaining')}</span>
                <span className="font-bold">{formatAmount(goal.remaining)}</span>
              </p>
              <p className="text-xs font-medium flex justify-between">
                <span>{t('savings.transferCap')}</span>
                <span className="font-bold">{formatAmount(budgetTransferCap)}</span>
              </p>
            </div>
          )}

          {budgetEnded && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <p className="text-xs font-medium">
                {t('savings.budgetEnded')}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="budget-amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('savings.transferAmount')}
            </Label>
            <Input
              id="budget-amount"
              type="number"
              placeholder={t('common.amountPlaceholder')}
              className="rounded-2xl h-12"
              value={budgetAmount}
              onChange={(event) => setBudgetAmount(event.target.value)}
              min="0"
              max={budgetTransferCap || undefined}
              step="0.01"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1 rounded-2xl font-bold" onClick={() => onOpenChange(false)}>
              {t('savings.cancel')}
            </Button>
            <Button
              className="flex-1 rounded-2xl font-bold bg-accent hover:bg-accent/90 shadow-fab"
              disabled={!selectedBudget}
              onClick={() => {
                const amount = Number(budgetAmount);
                if (selectedBudget && amount > 0 && amount <= budgetTransferCap) {
                  onBudgetTransfer(selectedBudget.id, amount);
                  setBudgetAmount('');
                  onOpenChange(false);
                }
              }}
            >
              {t('savings.moveLeftover')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </MobileDialog>
  );
}
