import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { ReportData } from "@/hooks/useReportData";
import { ReportFilters } from "@/hooks/useReportTemplates";

interface ExportOptions {
  reportData: ReportData;
  filters: ReportFilters;
  currencySymbol: string;
}

export interface DownloadResult {
  /** Human-readable save location shown in the toast */
  savedTo: string;
  /** 'downloads' = public Downloads/hisabify/, 'app-storage' = app-specific external, 'browser' = web download */
  method: 'downloads' | 'app-storage' | 'share' | 'browser';
}

/** Converts a Blob to a bare base64 string (no data-URL prefix). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Creates a directory, ignoring "already exists" errors. */
async function mkdirSafe(path: string, directory: Directory): Promise<void> {
  try {
    await Filesystem.mkdir({ path, directory, recursive: true });
  } catch {
    // Folder already exists — ignore
  }
}

/**
 * Android download strategy:
 *
 *  1. Request storage permissions.
 *  2. Try ExternalStorage → Download/hisabify/<filename>
 *     = /storage/emulated/0/Download/hisabify/
 *     Works on Android ≤ 9 (WRITE_EXTERNAL_STORAGE) and Android 10
 *     (requestLegacyExternalStorage=true in AndroidManifest).
 *  3. If that fails (Android 11+ scoped-storage enforcement or permission denied):
 *     fall back to app-specific external → hisabify/<filename>
 *     = /storage/emulated/0/Android/data/<app>/files/hisabify/
 *     Always writable, visible in Android's "Files" app under the app section.
 *  4. After a successful filesystem write, open the system Share sheet so the
 *     user can also "Open with" or send the file elsewhere.
 *
 * Web / iOS: standard blob-URL anchor click.
 */
async function downloadFile(content: string | Blob, filename: string, type: string): Promise<DownloadResult> {
  const blob = content instanceof Blob ? content : new Blob([content], { type });

  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    // --- Step 1: request permissions ---
    try {
      await Filesystem.requestPermissions();
    } catch {
      // Permission dialog failed or was already granted — continue
    }

    const base64 = await blobToBase64(blob);

    // --- Step 2: try public Downloads/hisabify/ ---
    try {
      await mkdirSafe('Download/hisabify', Directory.ExternalStorage);
      await Filesystem.writeFile({
        path: `Download/hisabify/${filename}`,
        data: base64,
        directory: Directory.ExternalStorage,
        recursive: true,
      });

      // Share so the user can open the file immediately if desired
      void shareFileAfterSave(blob, filename, type);

      return { savedTo: `Downloads/hisabify/${filename}`, method: 'downloads' };
    } catch {
      // Scoped storage (Android 11+) blocked writing to public Downloads — fall through
    }

    // --- Step 3: fall back to app-specific external storage ---
    try {
      await mkdirSafe('hisabify', Directory.External);
      await Filesystem.writeFile({
        path: `hisabify/${filename}`,
        data: base64,
        directory: Directory.External,
        recursive: true,
      });

      // Open share sheet so user can "Save to Downloads" manually
      await shareFileAfterSave(blob, filename, type);

      return { savedTo: `Files/hisabify/${filename}`, method: 'app-storage' };
    } catch {
      // Both filesystem paths failed — last resort: share sheet only
    }

    // --- Step 4: share sheet only ---
    try {
      const file = new File([blob], filename, { type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return { savedTo: filename, method: 'share' };
      }
    } catch {
      // User dismissed share sheet or share unsupported
    }
  }

  // --- Web / iOS: blob URL anchor click ---
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { savedTo: filename, method: 'browser' };
}

/** Silently triggers the system share sheet after a successful file save. */
async function shareFileAfterSave(blob: Blob, filename: string, type: string): Promise<void> {
  try {
    const file = new File([blob], filename, { type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
    }
  } catch {
    // User dismissed or share not supported — fine, file was already saved
  }
}

export async function exportReportToCSV({ reportData, filters, currencySymbol }: ExportOptions): Promise<DownloadResult> {
  const sections: string[] = [];

  // Summary section
  sections.push("SUMMARY STATISTICS");
  sections.push(
    Papa.unparse([
      ["Metric", "Value"],
      ["Total Expenses", `${currencySymbol}${reportData.summary.totalExpenses.toFixed(2)}`],
      ["Total Income", `${currencySymbol}${reportData.summary.totalIncome.toFixed(2)}`],
      ["Net Balance", `${currencySymbol}${reportData.summary.netBalance.toFixed(2)}`],
      ["Transaction Count", reportData.summary.transactionCount.toString()],
      ["Average Expense", `${currencySymbol}${reportData.summary.averageExpense.toFixed(2)}`],
      ["Average Income", `${currencySymbol}${reportData.summary.averageIncome.toFixed(2)}`],
    ])
  );

  // Category breakdown
  sections.push("\n\nCATEGORY BREAKDOWN");
  sections.push(
    Papa.unparse([
      ["Category", "Amount", "Count", "Percentage"],
      ...reportData.categoryBreakdown.map((c) => [
        c.category,
        `${currencySymbol}${c.amount.toFixed(2)}`,
        c.count.toString(),
        `${c.percentage.toFixed(1)}%`,
      ]),
    ])
  );

  // Daily expenses
  sections.push("\n\nDAILY EXPENSES");
  sections.push(
    Papa.unparse([
      ["Date", "Expenses", "Income"],
      ...reportData.dailyExpenses.map((d) => [
        d.date,
        `${currencySymbol}${d.expenses.toFixed(2)}`,
        `${currencySymbol}${d.income.toFixed(2)}`,
      ]),
    ])
  );

  // Budget performance
  if (reportData.budgetPerformance.length > 0) {
    sections.push("\n\nBUDGET PERFORMANCE");
    sections.push(
      Papa.unparse([
        ["Name", "Category", "Budgeted", "Spent", "Remaining", "Usage %"],
        ...reportData.budgetPerformance.map((b) => [
          b.name,
          b.category,
          `${currencySymbol}${b.budgeted.toFixed(2)}`,
          `${currencySymbol}${b.spent.toFixed(2)}`,
          `${currencySymbol}${b.remaining.toFixed(2)}`,
          `${b.percentage.toFixed(1)}%`,
        ]),
      ])
    );
  }

  // Transactions
  sections.push("\n\nTRANSACTIONS");
  sections.push(
    Papa.unparse([
      ["Date", "Merchant", "Category", "Type", "Amount", "Note"],
      ...reportData.transactions.map((t) => [
        t.date,
        t.merchant,
        t.category,
        t.type,
        `${currencySymbol}${t.amount.toFixed(2)}`,
        t.note || "",
      ]),
    ])
  );

  const filename = `report_${filters.dateFrom}_to_${filters.dateTo}.csv`;
  return downloadFile(sections.join("\n"), filename, "text/csv;charset=utf-8;");
}

export async function exportReportToPDF({ reportData, filters, currencySymbol }: ExportOptions): Promise<DownloadResult> {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Financial Report", 14, yPos);
  yPos += 10;

  // Date range
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${filters.dateFrom} to ${filters.dateTo}`, 14, yPos);
  yPos += 5;
  doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, yPos);
  yPos += 15;

  // Summary section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Summary Statistics", 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Value"]],
    body: [
      ["Total Expenses", `${currencySymbol}${reportData.summary.totalExpenses.toFixed(2)}`],
      ["Total Income", `${currencySymbol}${reportData.summary.totalIncome.toFixed(2)}`],
      ["Net Balance", `${currencySymbol}${reportData.summary.netBalance.toFixed(2)}`],
      ["Transaction Count", reportData.summary.transactionCount.toString()],
      ["Average Expense", `${currencySymbol}${reportData.summary.averageExpense.toFixed(2)}`],
    ],
    theme: "striped",
    headStyles: { fillColor: [124, 58, 237] },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Category breakdown
  if (reportData.categoryBreakdown.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Category Breakdown", 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Category", "Amount", "Count", "Percentage"]],
      body: reportData.categoryBreakdown.map((c) => [
        c.category,
        `${currencySymbol}${c.amount.toFixed(2)}`,
        c.count.toString(),
        `${c.percentage.toFixed(1)}%`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [124, 58, 237] },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Budget performance
  if (reportData.budgetPerformance.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Budget Performance", 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Name", "Budgeted", "Spent", "Remaining", "Usage"]],
      body: reportData.budgetPerformance.map((b) => [
        b.name,
        `${currencySymbol}${b.budgeted.toFixed(2)}`,
        `${currencySymbol}${b.spent.toFixed(2)}`,
        `${currencySymbol}${b.remaining.toFixed(2)}`,
        `${b.percentage.toFixed(1)}%`,
      ]),
      theme: "striped",
      headStyles: { fillColor: [124, 58, 237] },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Transactions (new page)
  doc.addPage();
  yPos = 20;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Transactions", 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [["Date", "Merchant", "Category", "Type", "Amount"]],
    body: reportData.transactions.slice(0, 50).map((t) => [
      t.date,
      t.merchant.substring(0, 20),
      t.category,
      t.type,
      `${currencySymbol}${t.amount.toFixed(2)}`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [124, 58, 237] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
  });

  if (reportData.transactions.length > 50) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`... and ${reportData.transactions.length - 50} more transactions`, 14, finalY);
  }

  const filename = `report_${filters.dateFrom}_to_${filters.dateTo}.pdf`;
  const pdfBlob = doc.output('blob');
  return downloadFile(pdfBlob, filename, 'application/pdf');
}
