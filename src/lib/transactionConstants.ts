/* ─── Shared Transaction Constants ─── */

/**
 * Predefined tag options available when creating or editing a transaction.
 * Exported here so they can be reused in filters (e.g., ExpensesPage) and
 * any future UI that needs the canonical tag list.
 */
export const PREDEFINED_TAGS = [
  'Tax Deductible',
  'Reimbursable',
  'Business',
  'Personal',
  'Vacation',
  'Medical',
] as const;

export type PredefinedTag = (typeof PREDEFINED_TAGS)[number];
