import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HandCoins, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/formatDate";
import { localizeNumber } from "@/lib/i18nNumber";

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
      <CardHeader className="flex flex-row items-center justify-between pb-3 h-12">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <HandCoins className="h-5 w-5 text-primary shrink-0" />
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
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "nowrap",
              overflowX: "auto",
              gap: "24px",
            }}
            className="pb-2 md:gap-6"
          >
            {savingsPerformance.map((goal) => {
              const pct = Math.min(goal.percentage, 100);
              const isCompleted = goal.isCompleted ?? pct >= 100;
              const colorClass = getProgressColor(pct, isCompleted);
              return (
                <div
                  key={goal.name}
                  style={{
                    flex: "0 0 auto",
                    width: "320px",
                  }}
                  className="sm:w-[85vw] md:w-auto rounded-lg border bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 min-w-0 h-6">
                      {isCompleted && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-chart-4" />
                      )}
                      <span className="text-sm font-medium truncate">{goal.name}</span>
                    </div>
                    {isCompleted && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-chart-4/15 text-chart-4 px-1.5 py-0.5 rounded-full shrink-0">
                        {t("reports.savings.completed")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-end justify-between mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-lg font-bold tabular-nums", colorClass)}>
                        {localizeNumber(pct)}%
                      </span>
                      <span className="text-xs text-muted-foreground">{t("reports.savings.target")}</span>
                    </div>
                  </div>

                  <Progress value={pct} className={cn("h-2 mb-2", isCompleted && "[&>div]:bg-chart-4")} />

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {formatAmount(goal.currentAmount)} <span className="text-muted-foreground/60">{t("reports.savings.of")}</span> {formatAmount(goal.targetAmount)}
                    </span>
                    {isCompleted && goal.completedAt ? (
                      <span className="text-chart-4">{formatDate(goal.completedAt, "MMM d")}</span>
                    ) : goal.deadline ? (
                      <span>{formatDate(goal.deadline, "MMM d, yyyy")}</span>
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
