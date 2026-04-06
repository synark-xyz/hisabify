import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HandCoins, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

interface SavingsGoalEntry {
  name: string;
  targetAmount: number;
  currentAmount: number;
  percentage: number;
  deadline: string | null;
  isCompleted?: boolean;
  completedAt?: string | null;
}

interface ReportSavingsSectionProps {
  savingsPerformance: SavingsGoalEntry[];
}

function getProgressColor(pct: number, isCompleted: boolean) {
  if (isCompleted || pct >= 100) return "text-chart-4";
  if (pct >= 60) return "text-primary";
  if (pct >= 30) return "text-chart-5";
  return "text-muted-foreground";
}

export function ReportSavingsSection({ savingsPerformance }: ReportSavingsSectionProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <HandCoins className="h-4 w-4 text-primary" />
          {t("reports.savings.title")}
        </CardTitle>
        <Link to="/savings" className="text-xs text-primary hover:underline font-medium">
          {t("reports.savings.viewAll")}
        </Link>
      </CardHeader>
      <CardContent>
        {savingsPerformance.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <HandCoins className="h-10 w-10 opacity-30" />
            <p className="text-sm">{t("reports.savings.noGoals")}</p>
            <Link to="/savings" className="text-sm text-primary hover:underline">
              {t("reports.savings.createFirst")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {savingsPerformance.map((goal) => {
              const pct = Math.min(goal.percentage, 100);
              const isCompleted = goal.isCompleted ?? pct >= 100;
              const colorClass = getProgressColor(pct, isCompleted);
              return (
                <div key={goal.name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isCompleted && (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-chart-4" />
                      )}
                      <span className="text-sm font-medium truncate">{goal.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCompleted && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide bg-chart-4/15 text-chart-4 px-1.5 py-0.5 rounded-full">
                          {t("reports.savings.completed")}
                        </span>
                      )}
                      <span className={cn("text-xs font-semibold tabular-nums", colorClass)}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <Progress value={pct} className={cn("h-1.5", isCompleted && "[&>div]:bg-chart-4")} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {formatAmount(goal.currentAmount)} <span className="text-muted-foreground/60">{t("reports.savings.of")}</span> {formatAmount(goal.targetAmount)}
                    </span>
                    {isCompleted && goal.completedAt ? (
                      <span className="text-chart-4">{t("reports.savings.completedOn", { date: format(parseISO(goal.completedAt), "MMM d, yyyy") })}</span>
                    ) : goal.deadline ? (
                      <span>{t("reports.savings.dueOn", { date: format(parseISO(goal.deadline), "MMM d, yyyy") })}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
