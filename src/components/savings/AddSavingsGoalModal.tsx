import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { MobileDialog } from "@/components/ui/mobile-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateSelect } from "@/components/ui/date-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { SavingsGoalWithProgress } from "@/hooks/useSavingsGoals";
import { useCurrency, currencyData } from "@/hooks/useCurrency";
import { useSubscription } from "@/hooks/useSubscription";
import { useKeyboardHandler } from "@/hooks/useKeyboardHandler";
import { useBudgetContext } from "@/hooks/useBudgetContext";
import { PremiumGuard } from "@/components/PremiumGuard";
import { calculateSavingsPace, type SavingsPlanFrequency } from "@/lib/savings";

const goalSchema = z.object({
  name: z.string().min(1),
  target_amount: z.coerce.number().positive(),
  current_amount: z.coerce.number().min(0).default(0),
  deadline: z.date().optional(),
  color: z.string().default("#10B981"),
  currency: z.string().default("USD"),
  linked_budget_id: z.string().optional(),
  reserve_amount: z.coerce.number().min(0).default(0),
  auto_contribute_enabled: z.boolean().default(false),
  auto_contribute_amount: z.coerce.number().min(0).nullable().default(null),
  auto_contribute_frequency: z.enum(["weekly", "monthly"]).nullable().default(null),
  plan_enabled: z.boolean().default(false),
  plan_frequency: z.enum(["daily", "weekly", "monthly"]).nullable().default(null),
  auto_remind: z.boolean().default(false),
});

type GoalFormValues = z.infer<typeof goalSchema>;

const colorOptions = [
  "#10B981", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];

interface AddSavingsGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GoalFormValues) => void;
  editingGoal?: SavingsGoalWithProgress | null;
}

export function AddSavingsGoalModal({
  open,
  onOpenChange,
  onSubmit,
  editingGoal,
}: AddSavingsGoalModalProps) {
  const { currency } = useCurrency();
  const { isPremium } = useSubscription();
  const { budgets } = useBudgetContext();
  const { t } = useTranslation();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  // Handle keyboard on mobile
  useKeyboardHandler(open);

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: "",
      target_amount: 0,
      current_amount: 0,
      color: "#10B981",
      currency: currency,
      linked_budget_id: undefined,
      reserve_amount: 0,
      auto_contribute_enabled: false,
      auto_contribute_amount: null,
      auto_contribute_frequency: null,
      plan_enabled: false,
      plan_frequency: null,
      auto_remind: false,
    },
  });

  const planEnabled = form.watch("plan_enabled");
  const planFrequency = form.watch("plan_frequency");
  const deadline = form.watch("deadline");
  const targetAmount = form.watch("target_amount");
  const currentAmount = form.watch("current_amount");
  const autoContributeEnabled = form.watch("auto_contribute_enabled");
  const goalName = form.watch("name");
  const amountRemaining = Math.max(Number(targetAmount || 0) - Number(editingGoal?.current_amount ?? currentAmount ?? 0), 0);
  const deadlineInPast = Boolean(deadline && isBefore(startOfDay(deadline), startOfDay(new Date())));

  const pacePreview = useMemo(() => {
    if (!planEnabled || !planFrequency || !deadline || deadlineInPast) {
      return null;
    }

    return calculateSavingsPace({
      target_amount: Number(targetAmount || 0),
      current_saved: Number(editingGoal?.current_amount ?? currentAmount ?? 0),
      deadline: deadline.toISOString(),
      created_at: editingGoal?.created_at || new Date().toISOString(),
      completed_at: editingGoal?.completed_at || null,
      plan_frequency: planFrequency,
      plan_start_date: editingGoal?.plan_start_date || editingGoal?.created_at || new Date().toISOString(),
      contribution_history: editingGoal
        ? editingGoal.contributionHistory
            .filter((entry) => entry.type === "contribution")
            .map((entry) => ({ amount: entry.amount, date: entry.date }))
        : [],
    });
  }, [currentAmount, deadline, deadlineInPast, editingGoal, planEnabled, planFrequency, targetAmount]);

  useEffect(() => {
    if (editingGoal) {
      const editingPlanEnabled = Boolean(editingGoal.plan_frequency);
      form.reset({
        name: editingGoal.name,
        target_amount: editingGoal.target_amount,
        current_amount: editingGoal.current_amount,
        deadline: editingGoal.deadline ? new Date(editingGoal.deadline) : undefined,
        color: editingGoal.color,
        currency: currency,
        linked_budget_id: editingGoal.linked_budget_id || undefined,
        reserve_amount: editingGoal.reserve_amount || 0,
        auto_contribute_enabled: editingGoal.auto_contribute_enabled,
        auto_contribute_amount: editingGoal.auto_contribute_amount,
        auto_contribute_frequency: editingGoal.auto_contribute_frequency,
        plan_enabled: editingPlanEnabled,
        plan_frequency: editingGoal.plan_frequency,
        auto_remind: editingGoal.auto_remind,
      });
      setPlanOpen(editingPlanEnabled);
    } else {
      form.reset({
        name: "",
        target_amount: 0,
        current_amount: 0,
        color: "#10B981",
        currency: currency,
        linked_budget_id: undefined,
        reserve_amount: 0,
        auto_contribute_enabled: false,
        auto_contribute_amount: null,
        auto_contribute_frequency: null,
        plan_enabled: false,
        plan_frequency: null,
        auto_remind: false,
      });
      setPlanOpen(false);
    }
  }, [editingGoal, form, currency]);

  useEffect(() => {
    if (!planEnabled) {
      form.setValue("plan_frequency", null);
      form.setValue("auto_remind", false);
    } else if (!planFrequency) {
      form.setValue("plan_frequency", "monthly");
    }
  }, [form, planEnabled, planFrequency]);

  useEffect(() => {
    if (!autoContributeEnabled || !pacePreview || pacePreview.required_per_period <= 0) {
      return;
    }

    const currentAutoAmount = form.getValues("auto_contribute_amount");
    const currentAutoFrequency = form.getValues("auto_contribute_frequency");

    if (!currentAutoAmount || currentAutoAmount <= 0) {
      form.setValue("auto_contribute_amount", pacePreview.required_per_period);
    }

    if (!currentAutoFrequency && (planFrequency === "weekly" || planFrequency === "monthly")) {
      form.setValue("auto_contribute_frequency", planFrequency);
    }
  }, [autoContributeEnabled, form, pacePreview, planFrequency]);

  const handleSubmit = (data: GoalFormValues) => {
    if (data.plan_enabled && !data.deadline) {
      form.setError("deadline", { type: "manual", message: "Target date is required for a savings schedule" });
      setPlanOpen(true);
      return;
    }

    if (data.plan_enabled && data.deadline && isBefore(startOfDay(data.deadline), startOfDay(new Date()))) {
      form.setError("deadline", { type: "manual", message: "Choose a future target date for the savings schedule" });
      setPlanOpen(true);
      return;
    }

    onSubmit({
      ...data,
      plan_frequency: data.plan_enabled ? data.plan_frequency : null,
      auto_remind: data.plan_enabled ? data.auto_remind : false,
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <MobileDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingGoal ? t('savings.editGoalTitle') : t('savings.createGoalTitle')}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {t('savings.goalName')}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t('savings.goalNamePlaceholder')} className="rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {t('savings.targetAmount')}
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field: currencyField }) => (
                          isPremium ? (
                            <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-20 rounded-xl flex items-center justify-between px-3"
                                >
                                  <span className="font-bold">
                                    {currencyData[currencyField.value]?.symbol || '$'}
                                  </span>
                                  <ChevronDown className="w-3 h-3 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-1 rounded-2xl shadow-xl" align="start">
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                  {Object.entries(currencyData).map(([code, { symbol }]) => (
                                    <button
                                      key={code}
                                      type="button"
                                      onClick={() => {
                                        currencyField.onChange(code);
                                        setCurrencyOpen(false);
                                      }}
                                      className={cn(
                                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-muted transition-colors',
                                        currencyField.value === code && 'bg-muted font-bold'
                                      )}
                                    >
                                      <span className="w-6 text-center">{symbol}</span>
                                      <span>{code}</span>
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-20 rounded-xl flex items-center justify-center px-3"
                              disabled
                            >
                              <span className="font-bold">
                                {currencyData[currencyField.value]?.symbol || '$'}
                              </span>
                            </Button>
                          )
                        )}
                      />
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10000"
                          className="rounded-xl flex-1"
                          {...field}
                          min="0"
                          step="0.01"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {editingGoal ? t('savings.currentSaved') : t('savings.startingAmount')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        className="rounded-xl"
                        {...field}
                        min="0"
                        step="0.01"
                        disabled={!!editingGoal}
                      />
                    </FormControl>
                    {editingGoal && (
                      <p className="text-xs text-muted-foreground">
                        {t('savings.savedProgressNote')}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {planEnabled ? t('savings.targetDate') : t('savings.targetDateOptional')}
                    </FormLabel>
                    <DateSelect value={field.value} onChange={field.onChange} />
                    {planEnabled && (
                      <p className="text-xs text-muted-foreground">
                        {t('savings.targetDateNote')}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linked_budget_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {t('savings.reserveFromBudget')}
                    </FormLabel>
                    <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={t('savings.optionalBudgetLink')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t('savings.noLinkedBudget')}</SelectItem>
                        {budgets.map((budget) => (
                          <SelectItem key={budget.id} value={budget.id}>
                            {budget.category?.name || budget.name || t('budget.budget')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reserve_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      {t('savings.savingsReserved')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        className="rounded-xl"
                        {...field}
                        min="0"
                        step="0.01"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Collapsible open={planOpen} onOpenChange={setPlanOpen}>
                <div className="rounded-2xl border border-border/50 p-4">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex w-full items-center justify-between text-left">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Savings Plan
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Set a savings schedule
                        </p>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", planOpen && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="plan_enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2">
                          <div>
                            <FormLabel className="text-sm font-medium text-foreground">
                              Set a savings schedule
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Track the required amount per period from your target date.
                            </p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {planEnabled && (
                      <>
                        <FormField
                          control={form.control}
                          name="plan_frequency"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                                Frequency
                              </FormLabel>
                              <FormControl>
                                <ToggleGroup
                                  type="single"
                                  value={field.value || ""}
                                  onValueChange={(value) => field.onChange((value || null) as SavingsPlanFrequency | null)}
                                  className="grid grid-cols-3 rounded-xl bg-muted/30 p-1"
                                >
                                  <ToggleGroupItem value="daily" className="rounded-lg text-xs font-bold uppercase tracking-wider">
                                    Daily
                                  </ToggleGroupItem>
                                  <ToggleGroupItem value="weekly" className="rounded-lg text-xs font-bold uppercase tracking-wider">
                                    Weekly
                                  </ToggleGroupItem>
                                  <ToggleGroupItem value="monthly" className="rounded-lg text-xs font-bold uppercase tracking-wider">
                                    Monthly
                                  </ToggleGroupItem>
                                </ToggleGroup>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="rounded-xl bg-muted/20 p-3 text-sm">
                          {!deadline ? (
                            <p className="text-muted-foreground">
                              Set a target date to enable scheduling.
                            </p>
                          ) : deadlineInPast ? (
                            <p className="text-amber-600">
                              Choose a future target date to calculate a valid savings plan.
                            </p>
                          ) : pacePreview ? (
                            <div className="space-y-2">
                              <p className="font-medium text-foreground">
                                Save <span className="font-semibold">
                                  {(currencyData[currency]?.symbol || "$")}{pacePreview.required_per_period.toFixed(2)}
                                </span>{' '}
                                every {pacePreview.period_label} to reach {goalName || "this goal"} by {format(deadline, "MMM d, yyyy")}.
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg bg-background/70 px-3 py-2">
                                  <p className="text-muted-foreground">Remaining to save</p>
                                  <p className="font-semibold text-foreground">
                                    {(currencyData[currency]?.symbol || "$")}{amountRemaining.toFixed(2)}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-background/70 px-3 py-2">
                                  <p className="text-muted-foreground">Periods remaining</p>
                                  <p className="font-semibold text-foreground">
                                    {pacePreview.periods_remaining} {pacePreview.period_label_plural}
                                  </p>
                                </div>
                              </div>

                              {editingGoal && (
                                <div className="rounded-lg bg-background/70 px-3 py-2 text-xs">
                                  <p className="text-muted-foreground">
                                    Current pace
                                  </p>
                                  <p className="font-semibold text-foreground">
                                    {(currencyData[currency]?.symbol || "$")}{pacePreview.current_pace.toFixed(2)} per {pacePreview.period_label}
                                  </p>
                                  {pacePreview.status === "behind" && pacePreview.suggested_deadline && (
                                    <p className="mt-1 text-amber-600">
                                      At this pace, you would finish around {format(new Date(pacePreview.suggested_deadline), "MMM d, yyyy")}.
                                    </p>
                                  )}
                                  {pacePreview.status === "on_track" && (
                                    <p className="mt-1 text-emerald-600">
                                      This goal is currently on track.
                                    </p>
                                  )}
                                  {pacePreview.status === "ahead" && (
                                    <p className="mt-1 text-emerald-600">
                                      This goal is ahead of schedule.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>

                        <FormField
                          control={form.control}
                          name="auto_remind"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2">
                              <div>
                                <FormLabel className="text-sm font-medium text-foreground">
                                  Auto-remind
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  Create a recurring reminder for the required amount.
                                </p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!deadline || !planFrequency || deadlineInPast} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {pacePreview && (
                          <p className="text-xs text-muted-foreground">
                            Reminder label: <span className="font-medium text-foreground">Savings: {goalName || "Goal Name"}</span>
                          </p>
                        )}
                      </>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <PremiumGuard featureName="Savings Automation">
                <div className="space-y-4 rounded-2xl border border-border/50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Auto-contribute
                  </p>

                  <FormField
                    control={form.control}
                    name="auto_contribute_enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2">
                        <FormLabel className="text-sm font-medium text-foreground">
                          Contribute automatically
                        </FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="auto_contribute_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                            Amount
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              className="rounded-xl"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value ? Number(event.target.value) : null)}
                              min="0"
                              step="0.01"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="auto_contribute_frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                            Frequency
                          </FormLabel>
                          <Select value={field.value || "monthly"} onValueChange={(value) => field.onChange(value as "weekly" | "monthly")}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  {!isPremium && (
                    <p className="text-xs text-muted-foreground">
                      Automate your savings with Hisabify Pro
                    </p>
                  )}
                </div>
              </PremiumGuard>

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      Color Theme
                    </FormLabel>
                    <FormControl>
                      <div className="flex gap-2 flex-wrap">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={cn(
                              "w-10 h-10 rounded-xl transition-all card-3d",
                              field.value === color
                                ? "ring-2 ring-offset-2 ring-accent border-glow scale-110"
                                : "hover:scale-105 opacity-70 hover:opacity-100"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => field.onChange(color)}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 rounded-xl"
                >
                  {t('savings.cancel')}
                </Button>
                <Button type="submit" className="flex-1 rounded-xl">
                  {editingGoal ? t('savings.updateGoal') : t('savings.createGoal')}
                </Button>
              </div>
          </form>
        </Form>
    </MobileDialog>
  );
}
