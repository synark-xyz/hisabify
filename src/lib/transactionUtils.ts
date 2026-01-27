import { Transaction } from "@/types";

export const getTransactionCategoryName = (tx: Transaction): string => {
    if (tx.category?.name) return tx.category.name;

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
