import { describe, it, expect } from 'vitest';
import { generateCSV } from '../useDataManagement';

const empty = {
  exportDate: '2026-07-30T00:00:00.000Z',
  userEmail: 'user@example.com',
  transactions: [],
  budgets: [],
  cards: [],
  savingsGoals: [],
  paymentReminders: [],
};

describe('generateCSV', () => {
  it('escapes commas and quotes so a row cannot be split or broken', () => {
    const csv = generateCSV({
      ...empty,
      transactions: [
        { date: '2026-07-01', merchant: 'Cafe "Le Bon", Dhaka', type: 'expense', amount: 12.5, currency_original: 'BDT', note: 'lunch, with team' },
      ],
    });

    // The merchant's embedded quotes are doubled and the whole cell is wrapped,
    // so the row still has exactly 6 fields despite containing 2 commas.
    expect(csv).toContain('"Cafe ""Le Bon"", Dhaka"');
    const row = csv.split('\n').find((l) => l.includes('Le Bon'))!;
    expect(row.match(/(?:^|,)"(?:[^"]|"")*"/g)).toHaveLength(6);
  });

  it('renders null and missing values as empty cells rather than "undefined"', () => {
    const csv = generateCSV({
      ...empty,
      cards: [{ card_holder: null, card_type: 'visa', last_four: '4242', balance: 0 }],
    });

    expect(csv).not.toContain('undefined');
    expect(csv).not.toContain('null');
    expect(csv).toContain('"","visa","4242","0"');
  });

  it('includes every data section so the export is complete for right-of-access', () => {
    const csv = generateCSV(empty);
    for (const section of ['TRANSACTIONS', 'BUDGETS', 'CARDS', 'SAVINGS GOALS', 'PAYMENT REMINDERS']) {
      expect(csv).toContain(section);
    }
  });
});
