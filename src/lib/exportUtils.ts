import { Transaction } from '@/types';
import { format } from 'date-fns';

interface ExportData {
  transactions: Transaction[];
  dateRange: { from: Date; to: Date };
}

export function exportToCSV({ transactions, dateRange }: ExportData): void {
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
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `transactions_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

export function exportBudgetsToCSV({ budgets }: BudgetExportData): void {
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
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `budgets_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
