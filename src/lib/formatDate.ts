import { format, Locale } from 'date-fns';
import { enUS, bn, ja } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const localeMap: Record<string, Locale> = {
  en: enUS,
  bn: bn,
  ja: ja,
};

const localizedNumerals: Record<string, string[]> = {
  bn: ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'],
  en: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
};

function localizeNumber(num: number, lang: string): string {
  const digits = num.toString().split('');
  const numerals = localizedNumerals[lang] || localizedNumerals.en;
  return digits.map((d) => numerals[parseInt(d)]).join('');
}

function formatWithLocalizedNumerals(date: Date, formatStr: string, lang: string): string {
  let result = formatStr;
  const dayNum = date.getDate();
  const localizedDay = localizeNumber(dayNum, lang);
  result = result.replace(/d+/g, (match) => {
    if (match.length === 1) return localizedDay;
    return localizedDay.padStart(match.length, '0');
  });
  return format(date, result, { locale: localeMap[lang] || enUS });
}

export function useFormatDate() {
  const { i18n } = useTranslation();
  const locale = localeMap[i18n.language] || enUS;
  const lang = i18n.language;

  const formatDate = (date: Date | string, formatStr: string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (lang === 'bn') {
      return formatWithLocalizedNumerals(dateObj, formatStr, lang);
    }
    return format(dateObj, formatStr, { locale });
  };

  return { formatDate, locale };
}

export function formatDate(date: Date | string, formatStr: string, language?: string): string {
  const lang = language || localStorage.getItem('language') || 'en';
  const locale = localeMap[lang] || enUS;
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (lang === 'bn' || lang === 'ja') {
    return formatWithLocalizedNumerals(dateObj, formatStr, lang);
  }
  return format(dateObj, formatStr, { locale });
}
