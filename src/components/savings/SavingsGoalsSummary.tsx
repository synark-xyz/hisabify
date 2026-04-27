import { Card, CardContent } from "@/components/ui/card";
import { Money, Target, TrendUp, CheckCircle } from "@phosphor-icons/react";
import { useCurrency } from "@/hooks/useCurrency";
import { useNumberTranslation } from '@/lib/i18nNumber';
import { useTranslation } from "react-i18next";

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
  const { tn } = useNumberTranslation();
  const { t } = useTranslation();
  const overallProgress = totalTarget > 0
    ? Math.round((totalSaved / totalTarget) * 100)
    : 0;

  const stats = [
    {
      label: t("savings.totalSaved"),
      value: formatAmount(totalSaved),
      icon: Money,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: t("savings.totalTarget"),
      value: formatAmount(totalTarget),
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: t("savings.overallProgress"),
      value: `${tn(overallProgress)}%`,
      icon: TrendUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: t("savings.completed"),
      value: `${tn(completedGoals)}/${tn(goalsCount)}`,
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
                <stat.icon className={`h-4 w-4 ${stat.color}`} weight="duotone" />
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
