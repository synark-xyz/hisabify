import i18n from 'i18next';
import { getLanguageLocale, Language } from '@/hooks/useLanguage';

export function useNumberTranslation() {
  const tn = (value: number, options?: Intl.NumberFormatOptions) => {
    const lang = i18n.language as Language;
    const locale = getLanguageLocale(lang);
    return new Intl.NumberFormat(locale, options).format(value);
  };

  return { tn };
}

/**
 * Standalone function to localize a number without a hook
 * Useful for converting numbers before passing to translation strings
 * @param value - The number to localize
 * @param options - Optional Intl.NumberFormatOptions
 * @returns Localized number string (uses current i18n language)
 */
export function localizeNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const lang = i18n.language as Language;
  const locale = getLanguageLocale(lang);
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a year number with locale-specific numerals but NO thousand separators
 * Used for displaying years (2026 → २०२६ in Bengali, not २,०२६)
 * @param year - The year number to format
 * @returns Localized year string without grouping
 */
export function localizeYear(year: number): string {
  const lang = i18n.language as Language;
  const locale = getLanguageLocale(lang);
  return new Intl.NumberFormat(locale, { useGrouping: false }).format(year);
}
