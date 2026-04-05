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
