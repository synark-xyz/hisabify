import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { ReportData } from "@/hooks/useReportData";
import { ReportFilters } from "@/hooks/useReportTemplates";
import { exportReportToCSV, exportReportToPDF } from "@/lib/reportExports";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";

interface ReportExportActionsProps {
  reportData: ReportData;
  filters: ReportFilters;
  isLoading: boolean;
  canExport?: boolean;
  onUpgradeRequired?: () => void;
}

export function ReportExportActions({
  reportData,
  filters,
  isLoading,
  canExport = true,
  onUpgradeRequired,
}: ReportExportActionsProps) {
  const { currencySymbol } = useCurrency();

  const toastSaveMessage = (savedTo: string, method: string) => {
    if (method === 'downloads') return `Saved to Downloads/hisabify/`;
    if (method === 'app-storage') return `Saved — use the share sheet to move to Downloads`;
    if (method === 'share') return `File shared successfully`;
    return `File downloaded`;
  };

  const handleExportCSV = async () => {
    if (!canExport) {
      onUpgradeRequired?.();
      return;
    }

    try {
      const result = await exportReportToCSV({ reportData, filters, currencySymbol });
      toast.success("CSV report saved!", { description: toastSaveMessage(result.savedTo, result.method) });
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  const handleExportPDF = async () => {
    if (!canExport) {
      onUpgradeRequired?.();
      return;
    }

    try {
      const result = await exportReportToPDF({ reportData, filters, currencySymbol });
      toast.success("PDF report saved!", { description: toastSaveMessage(result.savedTo, result.method) });
    } catch {
      toast.error("Failed to export PDF");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={handleExportCSV}
          disabled={isLoading || reportData.transactions.length === 0}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {canExport ? 'Export as CSV' : 'Export as CSV (Pro)'}
        </Button>
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={handleExportPDF}
          disabled={isLoading || reportData.transactions.length === 0}
        >
          <FileText className="h-4 w-4 mr-2" />
          {canExport ? 'Export as PDF' : 'Export as PDF (Pro)'}
        </Button>
        <p className="text-xs text-muted-foreground">
          {reportData.transactions.length} transactions will be included
        </p>
      </CardContent>
    </Card>
  );
}
