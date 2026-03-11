import { describe, it, expect } from 'vitest';
import {
  getTransactionCategoryName,
  getTransactionCategoryColor,
} from '../transactionUtils';
import type { Transaction } from '@/types';

// ---------------------------------------------------------------------------
// Helper — builds the minimum Transaction shape needed for the utility
// ---------------------------------------------------------------------------
function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    user_id: 'user-1',
    card_id: null,
    category_id: null,
    merchant: 'Test Merchant',
    amount: 10,
    type: 'expense',
    date: '2026-01-01',
    note: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getTransactionCategoryName
// ---------------------------------------------------------------------------
describe('getTransactionCategoryName', () => {
  it('returns the category name when a category object is present', () => {
    const tx = makeTx({
      category: {
        id: 'cat-1',
        name: 'Groceries',
        icon: 'shopping-cart',
        color: '#10B981',
        created_at: '2026-01-01',
      },
    });
    expect(getTransactionCategoryName(tx)).toBe('Groceries');
  });

  it('returns "Credit Card Bill" for a note containing [credit_card]', () => {
    const tx = makeTx({ note: 'Payment [credit_card]' });
    expect(getTransactionCategoryName(tx)).toBe('Credit Card Bill');
  });

  it('returns "Utility Bill" for a note containing [utility]', () => {
    const tx = makeTx({ note: 'Monthly electricity [utility]' });
    expect(getTransactionCategoryName(tx)).toBe('Utility Bill');
  });

  it('returns "Money Lent" for a note containing [lend]', () => {
    const tx = makeTx({ note: 'Lent to friend [lend]' });
    expect(getTransactionCategoryName(tx)).toBe('Money Lent');
  });

  it('returns "Debt Repayment" for a note containing [owe]', () => {
    const tx = makeTx({ note: 'Paying back loan [owe]' });
    expect(getTransactionCategoryName(tx)).toBe('Debt Repayment');
  });

  it('returns "Other Bill" for a note containing [custom]', () => {
    const tx = makeTx({ note: 'Misc payment [custom]' });
    expect(getTransactionCategoryName(tx)).toBe('Other Bill');
  });

  it('returns "Money Lent" when type is "lend" and no note markers', () => {
    const tx = makeTx({ type: 'lend' });
    expect(getTransactionCategoryName(tx)).toBe('Money Lent');
  });

  it('returns "Debt Repayment" when type is "owe" and no note markers', () => {
    const tx = makeTx({ type: 'owe' });
    expect(getTransactionCategoryName(tx)).toBe('Debt Repayment');
  });

  it('returns "Other" when there is no category, no note markers, and type is expense', () => {
    const tx = makeTx({ note: null });
    expect(getTransactionCategoryName(tx)).toBe('Other');
  });

  it('category name takes precedence over note markers', () => {
    // If both category and note are present, category name wins
    const tx = makeTx({
      note: 'Payment [credit_card]',
      category: {
        id: 'cat-1',
        name: 'Food',
        icon: 'utensils',
        color: '#10B981',
        created_at: '2026-01-01',
      },
    });
    expect(getTransactionCategoryName(tx)).toBe('Food');
  });
});

// ---------------------------------------------------------------------------
// getTransactionCategoryColor
// ---------------------------------------------------------------------------
describe('getTransactionCategoryColor', () => {
  it('returns the category color when a category object is present', () => {
    const tx = makeTx({
      category: {
        id: 'cat-1',
        name: 'Food',
        icon: 'utensils',
        color: '#34D399',
        created_at: '2026-01-01',
      },
    });
    expect(getTransactionCategoryColor(tx)).toBe('#34D399');
  });

  it('returns rose (#F43F5E) for a note containing [credit_card]', () => {
    const tx = makeTx({ note: '[credit_card] bill' });
    expect(getTransactionCategoryColor(tx)).toBe('#F43F5E');
  });

  it('returns sky (#0EA5E9) for a note containing [utility]', () => {
    const tx = makeTx({ note: '[utility]' });
    expect(getTransactionCategoryColor(tx)).toBe('#0EA5E9');
  });

  it('returns indigo (#6366F1) for a note containing [lend]', () => {
    const tx = makeTx({ note: '[lend]' });
    expect(getTransactionCategoryColor(tx)).toBe('#6366F1');
  });

  it('returns amber (#F59E0B) for a note containing [owe]', () => {
    const tx = makeTx({ note: '[owe]' });
    expect(getTransactionCategoryColor(tx)).toBe('#F59E0B');
  });

  it('returns slate (#94A3B8) for a note containing [custom]', () => {
    const tx = makeTx({ note: '[custom]' });
    expect(getTransactionCategoryColor(tx)).toBe('#94A3B8');
  });

  it('returns indigo for type "lend" with no note markers', () => {
    const tx = makeTx({ type: 'lend' });
    expect(getTransactionCategoryColor(tx)).toBe('#6366F1');
  });

  it('returns amber for type "owe" with no note markers', () => {
    const tx = makeTx({ type: 'owe' });
    expect(getTransactionCategoryColor(tx)).toBe('#F59E0B');
  });

  it('returns gray (#6B7280) as the ultimate fallback', () => {
    const tx = makeTx({ note: null });
    expect(getTransactionCategoryColor(tx)).toBe('#6B7280');
  });

  it('category color takes precedence over note markers', () => {
    const tx = makeTx({
      note: '[credit_card]',
      category: {
        id: 'cat-1',
        name: 'Food',
        icon: 'utensils',
        color: '#CUSTOM',
        created_at: '2026-01-01',
      },
    });
    expect(getTransactionCategoryColor(tx)).toBe('#CUSTOM');
  });
});
