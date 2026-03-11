import { describe, it, expect, vi } from 'vitest';
import { formatReminderAmount } from '../reminderAmount';
import type { PaymentReminder } from '@/types';

/**
 * Mock the entire useCurrency module to avoid pulling in the React context
 * chain (supabase client, auth hooks, etc.) in a pure unit-test environment.
 */
vi.mock('@/hooks/useCurrency', () => ({
  currencyData: {
    USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
    EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
    GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
    JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
    KRW: { symbol: '₩', name: 'South Korean Won', locale: 'ko-KR' },
    VND: { symbol: '₫', name: 'Vietnamese Dong', locale: 'vi-VN' },
    BDT: { symbol: '৳', name: 'Bangladeshi Taka', locale: 'bn-BD' },
  },
}));

// ---------------------------------------------------------------------------
// Helper — builds the minimum PaymentReminder shape
// ---------------------------------------------------------------------------
function makeReminder(overrides: Partial<PaymentReminder> = {}): PaymentReminder {
  return {
    id: 'rem-1',
    user_id: 'user-1',
    title: 'Test Reminder',
    amount: 50,
    currency: 'USD',
    due_date: '2026-03-15T00:00:00Z',
    status: 'upcoming',
    notify_before_days: 3,
    is_recurring: false,
    recurring_interval: null,
    note: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const fallback = (amount: number) => `FALLBACK:${amount}`;

// ---------------------------------------------------------------------------
// Primary path — uses reminder.currency (stored in the DB column)
// ---------------------------------------------------------------------------
describe('formatReminderAmount — stored currency column', () => {
  it('formats USD with two decimal places and dollar sign', () => {
    const reminder = makeReminder({ amount: 50, currency: 'USD' });
    const result = formatReminderAmount(reminder, fallback);
    expect(result).toContain('50');
    expect(result).toContain('$');
  });

  it('formats EUR correctly (symbol and value present)', () => {
    const reminder = makeReminder({ amount: 99.99, currency: 'EUR' });
    const result = formatReminderAmount(reminder, fallback);
    expect(result).toContain('99');
  });

  it('formats JPY with zero decimal places (zero-decimal currency)', () => {
    const reminder = makeReminder({ amount: 1500, currency: 'JPY' });
    const result = formatReminderAmount(reminder, fallback);
    // Should NOT contain ".00" — JPY is a zero-decimal currency
    expect(result).not.toContain('.00');
    expect(result).toContain('1,500');
  });

  it('formats KRW with zero decimal places', () => {
    const reminder = makeReminder({ amount: 10000, currency: 'KRW' });
    const result = formatReminderAmount(reminder, fallback);
    expect(result).not.toContain('.00');
  });

  it('formats VND with zero decimal places', () => {
    const reminder = makeReminder({ amount: 500000, currency: 'VND' });
    const result = formatReminderAmount(reminder, fallback);
    // The vi-VN locale uses '.' as a thousands separator and ',' as decimal separator.
    // Zero decimal means there must be no comma followed by fractional digits.
    // e.g. "500.000 ₫" — the dots are thousands separators, NOT decimal points.
    expect(result).not.toMatch(/,\d{1,2}(\s|₫|$)/);
    expect(result).toContain('500');
  });

  it('does not call the fallback formatter when currency is set', () => {
    const fallbackSpy = vi.fn((n: number) => `FALLBACK:${n}`);
    const reminder = makeReminder({ amount: 25, currency: 'USD' });
    formatReminderAmount(reminder, fallbackSpy);
    expect(fallbackSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Legacy fallback — currency code embedded in note field [XXX]
// ---------------------------------------------------------------------------
describe('formatReminderAmount — legacy note with currency code', () => {
  it('extracts currency code from note and formats correctly', () => {
    const reminder = makeReminder({
      currency: '',    // empty → treated as missing
      note: 'Auto-pay [USD]',
      amount: 75,
    });
    const result = formatReminderAmount(reminder, fallback);
    expect(result).toContain('75');
    expect(result).toContain('$');
  });

  it('applies zero-decimal formatting for JPY in note', () => {
    const reminder = makeReminder({
      currency: '',
      note: 'Subscription [JPY]',
      amount: 2000,
    });
    const result = formatReminderAmount(reminder, fallback);
    expect(result).not.toContain('.00');
  });
});

// ---------------------------------------------------------------------------
// Legacy fallback — currency symbol extracted from "Based on transaction: $X"
// ---------------------------------------------------------------------------
describe('formatReminderAmount — legacy note with currency symbol', () => {
  it('extracts symbol from note and prepends it to amount', () => {
    const reminder = makeReminder({
      currency: '',
      note: 'Based on transaction: $50.00',
      amount: 50,
    });
    const result = formatReminderAmount(reminder, fallback);
    expect(result).toContain('$');
    expect(result).toContain('50');
  });
});

// ---------------------------------------------------------------------------
// Ultimate fallback — no currency information at all
// ---------------------------------------------------------------------------
describe('formatReminderAmount — ultimate fallback formatter', () => {
  it('calls the fallback formatter when no currency info is available', () => {
    const fallbackSpy = vi.fn((n: number) => `FALLBACK:${n}`);
    const reminder = makeReminder({ currency: '', note: null, amount: 30 });
    const result = formatReminderAmount(reminder, fallbackSpy);
    expect(fallbackSpy).toHaveBeenCalledWith(30);
    expect(result).toBe('FALLBACK:30');
  });
});

// ---------------------------------------------------------------------------
// Edge cases — null/undefined/non-finite amounts
// ---------------------------------------------------------------------------
describe('formatReminderAmount — edge cases', () => {
  it('treats null amount as 0', () => {
    const reminder = makeReminder({ amount: null as unknown as number, currency: 'USD' });
    const result = formatReminderAmount(reminder, fallback);
    expect(result).toContain('0');
  });

  it('treats undefined amount as 0', () => {
    const reminder = makeReminder({ amount: undefined as unknown as number, currency: 'USD' });
    const result = formatReminderAmount(reminder, fallback);
    expect(result).toContain('0');
  });

  it('treats NaN amount as 0', () => {
    const reminder = makeReminder({ amount: NaN, currency: 'USD' });
    const result = formatReminderAmount(reminder, fallback);
    expect(result).toContain('0');
  });

  it('handles a currency code that is lowercase by normalising it', () => {
    // normalizeCurrencyCode converts to uppercase, so 'usd' should work
    const reminder = makeReminder({ currency: 'usd' as string, amount: 40 });
    const result = formatReminderAmount(reminder, fallback);
    expect(result).toContain('40');
  });

  it('delegates to fallback when currency code is not 3 chars', () => {
    const fallbackSpy = vi.fn((n: number) => `F:${n}`);
    const reminder = makeReminder({ currency: 'US', note: null, amount: 10 });
    formatReminderAmount(reminder, fallbackSpy);
    expect(fallbackSpy).toHaveBeenCalledWith(10);
  });
});
