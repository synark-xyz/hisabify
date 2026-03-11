import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileDialog } from "@/components/ui/mobile-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreVertical, Plus, Edit, Trash2, Target, Calendar, ArrowUpRight } from "lucide-react";
import { GoalThermometer } from "./GoalThermometer";
import { SavingsGoalWithProgress } from "@/hooks/useSavingsGoals";
import { format } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

interface SavingsGoalCardProps {
  goal: SavingsGoalWithProgress;
  onEdit: (goal: SavingsGoalWithProgress) => void;
  onDelete: (id: string) => void;
  onAddFunds: (id: string, amount: number) => void;
}

export function SavingsGoalCard({
  goal,
  onEdit,
  onDelete,
  onAddFunds,
}: SavingsGoalCardProps) {
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const { formatAmount, currencySymbol } = useCurrency();

  const handleAddFunds = () => {
    const amount = parseFloat(fundAmount);
    if (amount > 0) {
      onAddFunds(goal.id, amount);
      setFundAmount("");
      setShowAddFunds(false);
    }
  };

  const statusColors = {
    completed: "text-green-500",
    on_track: "text-accent",
    at_risk: "text-amber-500",
    behind: "text-rose-500",
  };

  const statusLabels = {
    completed: "Completed",
    on_track: "On Track",
    at_risk: "At Risk",
    behind: "Behind",
  };

  return (
    <>
      <Card className="overflow-visible border-border/50 bg-card/50 backdrop-blur-sm group hover:shadow-lg transition-all duration-300 card-3d">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: goal.color + "15" }}
              >
                <Target className="w-5 h-5 icon-glow" style={{ color: goal.color }} />
              </div>
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-tight">{goal.name}</CardTitle>
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    statusColors[goal.status]
                  )}
                >
                  {statusLabels[goal.status]}
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowAddFunds(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Funds
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(goal)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Goal
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Goal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex items-center gap-5">
            <GoalThermometer
              percentage={goal.percentage}
              color={goal.color}
              size="sm"
            />
            <div className="flex-1 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Progress</span>
                  <span className="text-foreground">{goal.percentage}%</span>
                </div>
                <Progress
                  value={goal.percentage}
                  className="h-1.5 bg-muted/30"
                  style={
                    {
                      "--progress-background": goal.color,
                    } as React.CSSProperties
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saved</p>
                  <p className="text-sm font-black text-foreground">
                    {formatAmount(goal.current_amount)}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target</p>
                  <p className="text-sm font-black text-foreground/70">
                    {formatAmount(goal.target_amount)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {goal.deadline && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {goal.daysLeft !== null && goal.daysLeft >= 0
                        ? `${goal.daysLeft} d left`
                        : `${format(new Date(goal.deadline), "MMM d")}`}
                    </span>
                  </div>
                )}

                {goal.status !== "completed" && (
                  <Button
                    size="sm"
                    className="h-8 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-xs"
                    onClick={() => setShowAddFunds(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Funds
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <MobileDialog
        open={showAddFunds}
        onOpenChange={setShowAddFunds}
        title={`Top Up "${goal.name}"`}
        className="z-[10000]"
        maxWidth="max-w-[400px]"
      >
        <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Amount to add
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-8 h-12 rounded-2xl font-bold text-lg"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">
                  {currencySymbol}
                </span>
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-2xl border border-border/50">
              <div className="space-y-1">
                <p className="text-xs font-medium flex justify-between">
                  <span>Current:</span>
                  <span className="font-bold">{formatAmount(goal.current_amount)}</span>
                </p>
                <p className="text-xs font-medium flex justify-between">
                  <span>Target:</span>
                  <span className="font-bold">{formatAmount(goal.target_amount)}</span>
                </p>
                <div className="h-px bg-border/50 my-1" />
                <p className="text-xs font-medium flex justify-between text-accent">
                  <span>Remaining:</span>
                  <span className="font-bold">{formatAmount(goal.remaining)}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1 rounded-2xl font-bold" onClick={() => setShowAddFunds(false)}>
                Cancel
              </Button>
              <Button className="flex-1 rounded-2xl font-bold bg-accent hover:bg-accent/90 shadow-fab" onClick={handleAddFunds}>
                Add Funds
                <ArrowUpRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </div>
      </MobileDialog>

      {/* Delete Confirmation Sheet */}
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
            <Button
              variant="ghost"
              className="flex-1 rounded-2xl font-bold"
              onClick={() => setShowDeleteConfirm(false)}
            >
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
    </>
  );
}
