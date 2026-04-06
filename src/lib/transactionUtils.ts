import { Transaction } from "@/types";
import i18n from "@/i18n";

/**
 * Returns true if the transaction is a real expense (not a savings contribution).
 * Savings contributions are stored as type 'expense' but have a savings_goal_id set.
 */
export function isRealExpense(tx: { type: string; savings_goal_id?: string | null; is_split_child?: boolean | null }): boolean {
  // Exclude split children — the parent already carries the total amount
  if (tx.is_split_child === true) return false;
  return (tx.type === 'expense' || tx.type === 'lend' || tx.type === 'owe') && !tx.savings_goal_id;
}

function getLocalizedCategoryName(name: string, translations?: Record<string, { name: string }>): string {
  const currentLocale = i18n.language || 'en';
  if (translations && translations[currentLocale]?.name?.trim()) {
    return translations[currentLocale].name;
  }
  return name;
}

export const getTransactionCategoryName = (tx: Transaction): string => {
    if (tx.category?.name) {
        return getLocalizedCategoryName(tx.category.name, tx.category.translations);
    }

    if (tx.savings_goal_id) {
        return tx.type === 'income' ? 'Savings Return' : 'Savings';
    }

    const note = tx.note || '';
    if (note.includes('[credit_card]')) return 'Credit Card Bill';
    if (note.includes('[utility]')) return 'Utility Bill';
    if (note.includes('[lend]')) return 'Money Lent';
    if (note.includes('[owe]')) return 'Debt Repayment';
    if (note.includes('[custom]')) return 'Other Bill';

    if (tx.type === 'lend') return 'Money Lent';
    if (tx.type === 'owe') return 'Debt Repayment';

    return 'Other';
};

export const getTransactionCategoryColor = (tx: Transaction): string => {
    if (tx.category?.color) return tx.category.color;

    if (tx.savings_goal_id) {
        return tx.type === 'income' ? '#3B82F6' : '#10B981';
    }

    const note = tx.note || '';
    if (note.includes('[credit_card]')) return '#F43F5E'; // Rose
    if (note.includes('[utility]')) return '#0EA5E9'; // Sky
    if (note.includes('[lend]')) return '#6366F1'; // Indigo
    if (note.includes('[owe]')) return '#F59E0B'; // Amber
    if (note.includes('[custom]')) return '#94A3B8'; // Slate

    if (tx.type === 'lend') return '#6366F1';
    if (tx.type === 'owe') return '#F59E0B';

    return '#6B7280'; // Gray
};
