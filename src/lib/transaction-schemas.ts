import { z } from 'zod';

/**
 * Transaction Form Validation Schemas
 */

export const expenseFormSchema = z.object({
  merchant: z.string().min(1, 'Description is required').max(100, 'Description too long'),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be a positive number'),
  categoryId: z.string().optional(),
  date: z.date({ required_error: 'Date is required' }),
  note: z.string().max(500, 'Note too long').optional(),
  currency: z.string().min(1, 'Currency is required'),
  cardId: z.string().optional(),
  paymentType: z.string().optional(),
  createReminder: z.boolean().default(false),
});

export const incomeFormSchema = z.object({
  merchant: z.string().min(1, 'Source description is required').max(100, 'Description too long'),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be a positive number'),
  incomeSource: z.string().optional(),
  date: z.date({ required_error: 'Date is required' }),
  note: z.string().max(500, 'Note too long').optional(),
  currency: z.string().min(1, 'Currency is required'),
  createReminder: z.boolean().default(false),
});

export type ExpenseFormData = z.infer<typeof expenseFormSchema>;
export type IncomeFormData = z.infer<typeof incomeFormSchema>;

/**
 * Filter and Sort Types
 */
export interface TransactionFilters {
  search: string;
  categoryId: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  type: 'all' | 'expense' | 'income';
  hasReceipt: boolean | null;
}

export type SortField = 'date' | 'amount' | 'merchant' | 'category';
export type SortDirection = 'asc' | 'desc';

export interface TransactionSort {
  field: SortField;
  direction: SortDirection;
}

export const defaultFilters: TransactionFilters = {
  search: '',
  categoryId: null,
  dateFrom: null,
  dateTo: null,
  type: 'all',
  hasReceipt: null,
};

export const defaultSort: TransactionSort = {
  field: 'date',
  direction: 'desc',
};
