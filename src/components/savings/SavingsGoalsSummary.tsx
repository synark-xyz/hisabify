import { Card, CardContent } from "@/components/ui/card";
import { PiggyBank, Target, TrendingUp, CheckCircle } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface SavingsGoalsSummaryProps {
  totalSaved: number;
  totalTarget: number;
  goalsCount: number;
  completedGoals: number;
}

export function SavingsGoalsSummary({
  totalSaved,
  totalTarget,
  goalsCount,
  completedGoals,
}: SavingsGoalsSummaryProps) {
  const { formatAmount } = useCurrency();
  const overallProgress = totalTarget > 0 
    ? Math.round((totalSaved / totalTarget) * 100) 
    : 0;

  const stats = [
    {
      label: "Total Saved",
      value: formatAmount(totalSaved),
      icon: PiggyBank,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Total Target",
      value: formatAmount(totalTarget),
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Overall Progress",
      value: `${overallProgress}%`,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Completed",
      value: `${completedGoals}/${goalsCount}`,
      icon: CheckCircle,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
