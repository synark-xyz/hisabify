import { useRef, useState } from "react";
import { FileBarChart, AlertCircle, RefreshCw } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ReportFiltersPanel,
  ReportSummary,
  ReportCharts,
  ReportTemplatesPanel,
  ReportExportActions,
  ReportSavingsSection,
} from "@/components/reports";
import { Link } from "react-router-dom";
import { useReportData } from "@/hooks/useReportData";
import { useReportTemplates, ReportFilters } from "@/hooks/useReportTemplates";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { canUseFeature } from "@/lib/entitlements";
import { enforceHistoryWindowForFilters } from "@/lib/historyLimits";
import { cn } from "@/lib/utils";
import { PullToRefresh } from "@/components/PullToRefresh";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useToast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const { variant } = useTheme();
  const { isPremium } = useSubscription();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const hasShownClampToastRef = useRef(false);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
    categoryIds: [],
    transactionType: "all",
  });

  const { reportData, isLoading, isError, categories } = useReportData(filters);
  const { templates, createTemplate, deleteTemplate } = useReportTemplates();
  const canExportReports = canUseFeature({ isPremium }, "report_export");

  const applyFreeHistoryWindow = (nextFilters: ReportFilters): ReportFilters => {
    const clamped = enforceHistoryWindowForFilters(nextFilters.dateFrom, nextFilters.dateTo, isPremium);
    if (clamped.wasClamped && !hasShownClampToastRef.current) {
      hasShownClampToastRef.current = true;
      toast({
        title: "History limit reached",
        description: "Free plan supports the last 30 days. Upgrade for full history.",
      });
      setShowUpgradeModal(true);
    }

    return {
      ...nextFilters,
      dateFrom: clamped.dateFrom,
      dateTo: clamped.dateTo,
    };
  };

  const handleSaveTemplate = (name: string, templateFilters: ReportFilters) => {
    createTemplate.mutate({ name, filters: templateFilters });
  };

  const handleLoadTemplate = (templateFilters: ReportFilters) => {
    setFilters(applyFreeHistoryWindow(templateFilters));
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate.mutate(id);
  };

  const handleRefresh = async () => {
    // Trigger re-fetch by updating filters slightly
    setFilters({ ...filters });
  };

  const handleFiltersChange = (nextFilters: ReportFilters) => {
    setFilters(applyFreeHistoryWindow(nextFilters));
  };

  return (
    <div className={cn("container mx-auto p-1space-y-2", variant === 'cyberpunk' ? "bg-transparent" : "bg-background")}>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-4">
          {/* Page header */}
          <div className="flex items-center gap-2.5 pb-1 border-b border-border/50 pt-4">
            <FileBarChart className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">{t('reports.title')}</h1>
          </div>

          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Sidebar - Filters & Templates */}
            <div className="space-y-4">
              <ReportFiltersPanel
                filters={filters}
                onFiltersChange={handleFiltersChange}
                categories={categories}
              />
              <ReportTemplatesPanel
                templates={templates}
                currentFilters={filters}
                onSaveTemplate={handleSaveTemplate}
                onLoadTemplate={handleLoadTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
              <ReportExportActions
                reportData={reportData}
                filters={filters}
                isLoading={isLoading}
                canExport={canExportReports}
                onUpgradeRequired={() => setShowUpgradeModal(true)}
              />
            </div>

            {/* Main Content - Report */}
            <div className="space-y-5">
              {isLoading ? (
                <>
                  <Skeleton className="h-32" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-[300px]" />
                    <Skeleton className="h-[300px]" />
                  </div>
                  <Skeleton className="h-[350px]" />
                </>
              ) : isError ? (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t('reports.failedToLoad')}</p>
                    <p className="text-xs mt-0.5 text-destructive/80">{t('reports.checkConnection')}</p>
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="shrink-0 flex items-center gap-1 text-xs font-medium hover:underline"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('reports.retry')}
                  </button>
                </div>
              ) : (
                <>
                  <ReportSummary summary={reportData.summary} />

                  <div className="flex items-center justify-between pl-3 border-l-2 border-primary/60">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{t('reports.expenseAnalysis')}</span>
                    <Link to="/transactions" className="text-xs text-primary hover:underline font-medium">{t('reports.viewTransactions')}</Link>
                  </div>
                  <ReportCharts reportData={reportData} />

                  <div className="flex items-center justify-between pl-3 border-l-2 border-primary/60">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{t('reports.savingsGoals')}</span>
                    <Link to="/budget" className="text-xs text-primary hover:underline font-medium">{t('reports.viewBudgets')}</Link>
                  </div>
                  <ReportSavingsSection savingsPerformance={reportData.savingsPerformance} />
                </>
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        source="reports_export"
      />
    </div>
  );
}
