import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { SavingsGoalWithProgress } from "@/hooks/useSavingsGoals";
import { useCurrency, currencyData } from "@/hooks/useCurrency";
import { useSubscription } from "@/hooks/useSubscription";
import { useKeyboardHandler } from "@/hooks/useKeyboardHandler";
import { useBudgetContext } from "@/hooks/useBudgetContext";
import { PremiumGuard } from "@/components/PremiumGuard";

const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  target_amount: z.coerce.number().positive("Target must be positive"),
  current_amount: z.coerce.number().min(0, "Cannot be negative").default(0),
  deadline: z.date().optional(),
  color: z.string().default("#10B981"),
  currency: z.string().default("USD"),
  linked_budget_id: z.string().optional(),
  reserve_amount: z.coerce.number().min(0, "Cannot be negative").default(0),
  auto_contribute_enabled: z.boolean().default(false),
  auto_contribute_amount: z.coerce.number().min(0, "Cannot be negative").nullable().default(null),
  auto_contribute_frequency: z.enum(["weekly", "monthly"]).nullable().default(null),
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
  const [currencyOpen, setCurrencyOpen] = useState(false);

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
    },
  });

  useEffect(() => {
    if (editingGoal) {
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
      });
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
      });
    }
  }, [editingGoal, form, currency]);

  const handleSubmit = (data: GoalFormValues) => {
    onSubmit(data);
    onOpenChange(false);
    form.reset();
  };

  return (
    <MobileDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingGoal ? "Edit Savings Goal" : "Create Savings Goal"}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">
                      Goal Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Emergency Fund" className="rounded-xl" {...field} />
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
                      Target Amount
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
                      {editingGoal ? "Current Saved" : "Starting Amount"}
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
                        Saved progress is derived from transactions and cannot be edited directly.
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
                      Target Date (Optional)
                    </FormLabel>
                    <DateSelect value={field.value} onChange={field.onChange} />
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
                      Reserve From Budget
                    </FormLabel>
                    <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Optional budget link" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No linked budget</SelectItem>
                        {budgets.map((budget) => (
                          <SelectItem key={budget.id} value={budget.id}>
                            {budget.category?.name || budget.name || "Budget"}
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
                      Savings Reserved
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
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={field.value}
                            onChange={(event) => field.onChange(event.target.checked)}
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
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 rounded-xl">
                  {editingGoal ? "Update Goal" : "Create Goal"}
                </Button>
              </div>
          </form>
        </Form>
    </MobileDialog>
  );
}
