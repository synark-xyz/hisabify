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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreVertical, Plus, Edit, Trash2, Target, Calendar } from "lucide-react";
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
  const [fundAmount, setFundAmount] = useState("");
  const { formatAmount } = useCurrency();

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
    on_track: "text-blue-500",
    at_risk: "text-yellow-500",
    behind: "text-red-500",
  };

  const statusLabels = {
    completed: "Completed! 🎉",
    on_track: "On Track",
    at_risk: "At Risk",
    behind: "Behind Schedule",
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: goal.color + "20" }}
              >
                <Target className="w-4 h-4" style={{ color: goal.color }} />
              </div>
              <div>
                <CardTitle className="text-base">{goal.name}</CardTitle>
                <span
                  className={cn(
                    "text-xs font-medium",
                    statusColors[goal.status]
                  )}
                >
                  {statusLabels[goal.status]}
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowAddFunds(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Funds
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(goal)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(goal.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <GoalThermometer
              percentage={goal.percentage}
              color={goal.color}
              size="md"
            />
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{goal.percentage}%</span>
                </div>
                <Progress
                  value={goal.percentage}
                  className="h-2"
                  style={
                    {
                      "--progress-background": goal.color,
                    } as React.CSSProperties
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Saved</p>
                  <p className="font-semibold" style={{ color: goal.color }}>
                    {formatAmount(goal.current_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Target</p>
                  <p className="font-semibold">
                    {formatAmount(goal.target_amount)}
                  </p>
                </div>
              </div>

              {goal.deadline && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {goal.daysLeft !== null && goal.daysLeft >= 0
                      ? `${goal.daysLeft} days left`
                      : `Due ${format(new Date(goal.deadline), "MMM d, yyyy")}`}
                  </span>
                </div>
              )}

              {goal.status !== "completed" && (
                <Button
                  size="sm"
                  className="w-full"
                  variant="outline"
                  onClick={() => setShowAddFunds(true)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Funds
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddFunds} onOpenChange={setShowAddFunds}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Funds to "{goal.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>
                Current: {formatAmount(goal.current_amount)} /{" "}
                {formatAmount(goal.target_amount)}
              </p>
              <p>
                Remaining: {formatAmount(goal.remaining)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFunds(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFunds}>Add Funds</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
