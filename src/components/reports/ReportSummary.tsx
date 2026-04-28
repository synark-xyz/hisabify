import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Calculator, Hash, ArrowDownUp } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { ReportData } from "@/hooks/useReportData";

interface ReportSummaryProps {
  summary: ReportData["summary"];
}

function safeFormat(value: number | undefined | null, formatAmount: (n: number) => string): string {
  if (value === undefined || value === null || isNaN(value)) {
    return formatAmount(0);
  }
  return formatAmount(value);
}

export function ReportSummary({ summary }: ReportSummaryProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();

  const stats = [
    {
      labelKey: "reports.summary.totalExpenses",
      value: safeFormat(summary.totalExpenses, formatAmount),
      icon: TrendingDown,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      labelKey: "reports.summary.totalIncome",
      value: safeFormat(summary.totalIncome, formatAmount),
      icon: TrendingUp,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      labelKey: "reports.summary.netBalance",
      value: safeFormat(summary.netBalance, formatAmount),
      icon: ArrowDownUp,
      color: (summary.netBalance ?? 0) >= 0 ? "text-chart-4" : "text-destructive",
      bgColor: (summary.netBalance ?? 0) >= 0 ? "bg-chart-4/10" : "bg-destructive/10",
    },
    {
      labelKey: "reports.summary.transactions",
      value: (summary.transactionCount ?? 0).toString(),
      icon: Hash,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      labelKey: "reports.summary.avgExpense",
      value: safeFormat(summary.averageExpense, formatAmount),
      icon: Calculator,
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
    {
      labelKey: "reports.summary.avgIncome",
      value: safeFormat(summary.averageIncome, formatAmount),
      icon: Calculator,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{t('reports.summary.title')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-border/50">
          {stats.map((stat, i) => (
            <div key={stat.labelKey} className={`flex flex-col items-center gap-2 px-3 py-2 ${i < 2 ? "md:border-b lg:border-b-0 border-b border-border/50" : ""}`}>
              <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="text-center">
                <p className={`text-base font-semibold tabular-nums leading-tight ${stat.color}`}>{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{t(stat.labelKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
