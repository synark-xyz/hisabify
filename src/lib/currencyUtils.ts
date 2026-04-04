/**
 * Currency Symbol/Name to ISO 4217 Code Mapping Utilities
 * 
 * This module provides utilities to parse currency information from various sources
 * (voice input, receipt scans, user input) and map them to standardized ISO 4217 codes.
 */

import { currencyData } from '@/hooks/useCurrency';

// Map of currency symbols and name variants to ISO 4217 codes
// Order matters: more specific patterns should come before general ones
const currencySymbolMap: Array<{ patterns: string[]; code: string }> = [
  // Japanese Yen
  { patterns: ['JP¥', 'JPY', '¥', '円', '日本円'], code: 'JPY' },
  // Chinese Yuan / RMB
  { patterns: ['CN¥', 'RMB', '元', '圓', '人民币', 'CNY'], code: 'CNY' },
  // Korean Won
  { patterns: ['KRW', '₩', '원', '한화'], code: 'KRW' },
  // Vietnamese Dong
  { patterns: ['VND', '₫', 'đồng', 'dong'], code: 'VND' },
  // Bangladeshi Taka
  { patterns: ['BDT', '৳', 'টাকা', 'Tk', 'tk'], code: 'BDT' },
  // Indian Rupee
  { patterns: ['INR', '₹', 'rupees', 'rupee', 'Rs', 'rs', '₹'], code: 'INR' },
  // Pakistani Rupee
  { patterns: ['PKR', 'pkr', 'rupees', 'Rs'], code: 'PKR' },
  // Indonesian Rupiah
  { patterns: ['IDR', 'Rp', 'rupiah'], code: 'IDR' },
  // Philippine Peso
  { patterns: ['PHP', '₱', 'pesos', 'peso'], code: 'PHP' },
  // Thai Baht
  { patterns: ['THB', '฿', 'baht'], code: 'THB' },
  // Malaysian Ringgit
  { patterns: ['MYR', 'RM', 'ringgit'], code: 'MYR' },
  // Singapore Dollar
  { patterns: ['SGD', 'S$'], code: 'SGD' },
  // Hong Kong Dollar
  { patterns: ['HKD', 'HK$'], code: 'HKD' },
  // US Dollar (various formats)
  { patterns: ['USD', '$', 'US$', 'US dollar', 'dollar', 'dollars'], code: 'USD' },
  // Euro
  { patterns: ['EUR', '€', 'euro', 'euros'], code: 'EUR' },
  // British Pound
  { patterns: ['GBP', '£', 'GB£', 'pound', 'pounds', 'sterling'], code: 'GBP' },
  // Canadian Dollar
  { patterns: ['CAD', 'C$', 'CA$', 'canadian dollar'], code: 'CAD' },
  // Australian Dollar
  { patterns: ['AUD', 'A$', 'AU$', 'australian dollar'], code: 'AUD' },
  // New Zealand Dollar
  { patterns: ['NZD', 'NZ$'], code: 'NZD' },
  // Swiss Franc
  { patterns: ['CHF', 'Fr', 'swiss franc'], code: 'CHF' },
  // Swedish Krona
  { patterns: ['SEK', 'kr', 'skr', 'swedish krona'], code: 'SEK' },
  // Norwegian Krone
  { patterns: ['NOK', 'nok', 'norwegian krone'], code: 'NOK' },
  // Danish Krone
  { patterns: ['DKK', 'dkk', 'danish krone'], code: 'DKK' },
  // Polish Zloty
  { patterns: ['PLN', 'zł', 'zl', 'polish zloty'], code: 'PLN' },
  // Czech Koruna
  { patterns: ['CZK', 'Kč', 'czk', 'czech koruna'], code: 'CZK' },
  // Hungarian Forint
  { patterns: ['HUF', 'Ft', 'huf', 'hungarian forint'], code: 'HUF' },
  // Brazilian Real
  { patterns: ['BRL', 'R$', 'real', 'reais'], code: 'BRL' },
  // Mexican Peso
  { patterns: ['MXN', 'MX$', 'peso', 'pesos'], code: 'MXN' },
  // Argentine Peso
  { patterns: ['ARS', 'ar$', 'argentine peso'], code: 'ARS' },
  // Chilean Peso
  { patterns: ['CLP', 'CL$', 'chilean peso'], code: 'CLP' },
  // Colombian Peso
  { patterns: ['COP', 'CO$', 'colombian peso'], code: 'COP' },
  // Turkish Lira
  { patterns: ['TRY', '₺', 'TL', 'turkish lira', 'lira'], code: 'TRY' },
  // Russian Ruble
  { patterns: ['RUB', '₽', 'руб', 'russian ruble', 'rubles'], code: 'RUB' },
  // Ukrainian Hryvnia
  { patterns: ['UAH', '₴', 'uah', 'hryvnia'], code: 'UAH' },
  // South African Rand
  { patterns: ['ZAR', 'R', 'zar', 'rand'], code: 'ZAR' },
  // UAE Dirham
  { patterns: ['AED', 'د.إ', 'aed', 'dirham'], code: 'AED' },
  // Saudi Riyal
  { patterns: ['SAR', '﷼', 'sar', 'riyal', 'riyals'], code: 'SAR' },
  // Israeli Shekel
  { patterns: ['ILS', '₪', 'shekel', 'shekels'], code: 'ILS' },
  // Nigerian Naira
  { patterns: ['NGN', '₦', 'ngn', 'naira'], code: 'NGN' },
  // Kenyan Shilling
  { patterns: ['KES', 'KSh', 'kes', 'shilling'], code: 'KES' },
  // Egyptian Pound
  { patterns: ['EGP', 'E£', 'egp', 'egyptian pound'], code: 'EGP' },
];

/**
 * Parse currency from a string that may contain various formats
 * Handles symbols, ISO codes, and localized currency names
 * 
 * @param input - String containing currency information (e.g., "¥5000", "100 JPY", "500 dollars")
 * @returns The detected ISO 4217 currency code, or undefined if not detected
 */
export function parseCurrencyFromString(input: string): string | undefined {
  if (!input) return undefined;
  
  const normalizedInput = input.trim().toUpperCase();
  
  // First, try to find an exact ISO code match
  for (const entry of currencySymbolMap) {
    if (entry.code === normalizedInput && currencyData[entry.code]) {
      return entry.code;
    }
  }
  
  // Then try pattern matching
  for (const entry of currencySymbolMap) {
    for (const pattern of entry.patterns) {
      // Check if input contains the pattern (case-insensitive for text, exact for symbols)
      const isSymbol = /^[^\w\s]$/.test(pattern);
      if (isSymbol) {
        if (normalizedInput.includes(pattern.toUpperCase())) {
          if (currencyData[entry.code]) {
            return entry.code;
          }
        }
      } else {
        const patternUpper = pattern.toUpperCase();
        const patternLower = pattern.toLowerCase();
        if (normalizedInput.includes(patternUpper) || input.toLowerCase().includes(patternLower)) {
          if (currencyData[entry.code]) {
            return entry.code;
          }
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Extract currency from a numeric string that might include currency symbols
 * 
 * @param amountString - String like "¥1,500", "$25.50", "1000円"
 * @returns Object with amount (number) and currency code
 */
export function parseAmountWithCurrency(amountString: string): { amount: number; currency: string | undefined } {
  let currency: string | undefined;
  let cleanAmountString = amountString;
  
  // Try to extract currency from the string
  const detectedCurrency = parseCurrencyFromString(amountString);
  if (detectedCurrency) {
    currency = detectedCurrency;
    // Remove the currency pattern from the amount string
    for (const entry of currencySymbolMap) {
      if (entry.code === detectedCurrency) {
        for (const pattern of entry.patterns) {
          cleanAmountString = cleanAmountString.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
        }
        break;
      }
    }
  }
  
  // Remove common non-numeric characters except decimal separator and minus sign
  cleanAmountString = cleanAmountString
    .replace(/[^\d.,-]/g, '')
    .replace(/,(?=\d{3})/g, '');
  
  // Handle different decimal separators
  const lastDotIndex = cleanAmountString.lastIndexOf('.');
  const lastCommaIndex = cleanAmountString.lastIndexOf(',');
  
  if (lastCommaIndex > lastDotIndex && lastCommaIndex !== -1) {
    // European format: 1.234,56 -> 1234.56
    cleanAmountString = cleanAmountString.replace(/\./g, '').replace(',', '.');
  }
  
  const amount = parseFloat(cleanAmountString);
  
  return {
    amount: isNaN(amount) ? 0 : amount,
    currency
  };
}

/**
 * Validate if a currency code is supported
 * 
 * @param code - ISO 4217 currency code
 * @returns true if the code is valid and supported
 */
export function isValidCurrencyCode(code: string): boolean {
  return code in currencyData;
}

/**
 * Get the display format for a currency code
 * 
 * @param code - ISO 4217 currency code
 * @returns Object with symbol, name, and locale
 */
export function getCurrencyDisplay(code: string): { symbol: string; name: string; locale: string } | undefined {
  return currencyData[code];
}

/**
 * Normalize currency input to ISO 4217 code
 * Handles various formats and returns the standardized code
 * 
 * @param input - Currency in any format (symbol, code, name)
 * @param fallback - Fallback code if parsing fails (default: 'USD')
 * @returns ISO 4217 currency code
 */
export function normalizeCurrency(input: string | undefined, fallback: string = 'USD'): string {
  if (!input) return fallback;
  
  const detected = parseCurrencyFromString(input);
  return detected || fallback;
}

/**
 * Currency symbol to code mapping for display purposes
 */
export const currencySymbols: Record<string, string> = Object.entries(currencyData).reduce(
  (acc, [code, data]) => {
    acc[code] = data.symbol;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * List of all supported currency codes
 */
export const supportedCurrencies = Object.keys(currencyData);
