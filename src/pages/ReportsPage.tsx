import { useState } from "react";
import { FileBarChart } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ReportFiltersPanel,
  ReportSummary,
  ReportCharts,
  ReportTemplatesPanel,
  ReportExportActions,
} from "@/components/reports";
import { useReportData } from "@/hooks/useReportData";
import { useReportTemplates, ReportFilters } from "@/hooks/useReportTemplates";

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
    categoryIds: [],
    transactionType: "all",
  });

  const { reportData, isLoading, categories } = useReportData(filters);
  const { templates, createTemplate, deleteTemplate } = useReportTemplates();

  const handleSaveTemplate = (name: string, templateFilters: ReportFilters) => {
    createTemplate.mutate({ name, filters: templateFilters });
  };

  const handleLoadTemplate = (templateFilters: ReportFilters) => {
    setFilters(templateFilters);
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate.mutate(id);
  };

  return (
    <div className="container mx-auto p-4 pb-24 space-y-6">
      <div className="flex items-center gap-2">
        <FileBarChart className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Sidebar - Filters & Templates */}
        <div className="space-y-4">
          <ReportFiltersPanel
            filters={filters}
            onFiltersChange={setFilters}
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
          />
        </div>

        {/* Main Content - Report */}
        <div className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32" />
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-[300px]" />
                <Skeleton className="h-[300px]" />
              </div>
              <Skeleton className="h-[350px]" />
            </>
          ) : (
            <>
              <ReportSummary summary={reportData.summary} />
              <ReportCharts reportData={reportData} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
