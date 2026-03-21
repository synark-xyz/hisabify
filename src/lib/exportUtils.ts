import { Transaction } from '@/types';
import { format } from 'date-fns';
import { Capacitor } from '@capacitor/core';

interface ExportData {
  transactions: Transaction[];
  dateRange: { from: Date; to: Date };
}

async function nativeAwareDownload(blob: Blob, filename: string, type: string): Promise<void> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const file = new File([blob], filename, { type });
      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch {
      // Share cancelled or unsupported — fall through
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToCSV({ transactions, dateRange }: ExportData): Promise<void> {
  const headers = [
    'Date',
    'Merchant',
    'Category',
    'Type',
    'Amount',
    'Currency',
    'Note',
  ];

  const rows = transactions.map(tx => [
    format(new Date(tx.date), 'yyyy-MM-dd'),
    tx.merchant,
    tx.category?.name || 'Other',
    tx.type,
    tx.amount.toString(),
    tx.currency_base || 'USD',
    tx.note || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `transactions_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
  await nativeAwareDownload(blob, filename, 'text/csv;charset=utf-8;');
}

interface BudgetExportData {
  budgets: Array<{
    name: string;
    category?: string;
    amount: number;
    spent: number;
    remaining: number;
    period: string;
    startDate: string;
    endDate: string;
  }>;
}

export async function exportBudgetsToCSV({ budgets }: BudgetExportData): Promise<void> {
  const headers = [
    'Name',
    'Category',
    'Budget Amount',
    'Spent',
    'Remaining',
    'Period',
    'Start Date',
    'End Date',
  ];

  const rows = budgets.map(b => [
    b.name,
    b.category || 'General',
    b.amount.toString(),
    b.spent.toString(),
    b.remaining.toString(),
    b.period,
    b.startDate,
    b.endDate,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `budgets_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  await nativeAwareDownload(blob, filename, 'text/csv;charset=utf-8;');
}
