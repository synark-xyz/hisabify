import { currencyData } from '@/hooks/useCurrency';
import { PaymentReminder } from '@/types';

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

export function formatReminderAmount(
  reminder: PaymentReminder,
  fallbackFormatter: (amount: number) => string
): string {
  const amount = Number(reminder.amount || 0);
  const normalized = Number.isFinite(amount) ? amount : 0;

  const code = extractCurrencyCode(reminder.note);
  if (code) {
    const symbol = currencyData[code]?.symbol;
    const formatted = normalized.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return symbol ? `${symbol}${formatted}` : `${code} ${formatted}`;
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
