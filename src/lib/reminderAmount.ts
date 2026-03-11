import { currencyData } from '@/hooks/useCurrency';
import { PaymentReminder } from '@/types';

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND']);

function extractCurrencyCode(note: string | null): string | null {
  if (!note) {
    return null;
  }

  const match = note.match(/\[([A-Z]{3})\]/);
  return match ? match[1] : null;
}

function extractCurrencySymbol(note: string | null): string | null {
  if (!note) {
    return null;
  }

  const match = note.match(/Based on transaction:\s*([^0-9\s]{1,3})\s*[0-9]/i);
  return match ? match[1] : null;
}

function normalizeCurrencyCode(code?: string | null): string | null {
  if (!code) {
    return null;
  }

  const upper = code.toUpperCase();
  return upper.length === 3 ? upper : null;
}

function formatByCurrency(amount: number, currencyCode: string): string {
  const locale = currencyData[currencyCode]?.locale || 'en-US';
  const minMaxDigits = ZERO_DECIMAL_CURRENCIES.has(currencyCode) ? 0 : 2;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: minMaxDigits,
      maximumFractionDigits: minMaxDigits,
    }).format(amount);
  } catch {
    const symbol = currencyData[currencyCode]?.symbol || `${currencyCode} `;
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: minMaxDigits,
      maximumFractionDigits: minMaxDigits,
    })}`;
  }
}

export function formatReminderAmount(
  reminder: PaymentReminder,
  fallbackFormatter: (amount: number) => string
): string {
  const amount = Number(reminder.amount || 0);
  const normalized = Number.isFinite(amount) ? amount : 0;

  // Source of truth: reminder currency from DB.
  const storedCurrency = normalizeCurrencyCode(reminder.currency);
  if (storedCurrency) {
    return formatByCurrency(normalized, storedCurrency);
  }

  // Legacy fallback for old rows saved before currency column existed.
  const parsedCode = normalizeCurrencyCode(extractCurrencyCode(reminder.note));
  if (parsedCode) {
    return formatByCurrency(normalized, parsedCode);
  }

  const symbol = extractCurrencySymbol(reminder.note);
  if (symbol) {
    return `${symbol}${normalized.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return fallbackFormatter(normalized);
}
