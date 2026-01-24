import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Calculator, Hash, ArrowDownUp } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { ReportData } from "@/hooks/useReportData";

interface ReportSummaryProps {
  summary: ReportData["summary"];
}

export function ReportSummary({ summary }: ReportSummaryProps) {
  const { formatAmount } = useCurrency();

  const stats = [
    {
      label: "Total Expenses",
      value: formatAmount(summary.totalExpenses),
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Total Income",
      value: formatAmount(summary.totalIncome),
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Net Balance",
      value: formatAmount(summary.netBalance),
      icon: ArrowDownUp,
      color: summary.netBalance >= 0 ? "text-green-500" : "text-red-500",
      bgColor: summary.netBalance >= 0 ? "bg-green-500/10" : "bg-red-500/10",
    },
    {
      label: "Transactions",
      value: summary.transactionCount.toString(),
      icon: Hash,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Avg. Expense",
      value: formatAmount(summary.averageExpense),
      icon: Calculator,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "Avg. Income",
      value: formatAmount(summary.averageIncome),
      icon: Calculator,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Summary Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className={`w-10 h-10 rounded-full ${stat.bgColor} flex items-center justify-center mx-auto mb-2`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-lg font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
