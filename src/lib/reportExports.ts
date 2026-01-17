import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ReportData } from "@/hooks/useReportData";
import { ReportFilters } from "@/hooks/useReportTemplates";

interface ExportOptions {
  reportData: ReportData;
  filters: ReportFilters;
  currencySymbol: string;
}

function downloadFile(content: string | Blob, filename: string, type: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportToCSV({ reportData, filters, currencySymbol }: ExportOptions) {
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
  downloadFile(sections.join("\n"), filename, "text/csv;charset=utf-8;");
}

export function exportReportToPDF({ reportData, filters, currencySymbol }: ExportOptions) {
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
  doc.save(filename);
}
