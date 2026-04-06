import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/translation.json';
import bn from './locales/bn/translation.json';
import ja from './locales/ja/translation.json';

export const resources = {
  en: { translation: en },
  bn: { translation: bn },
  ja: { translation: ja },
};

export type Language = 'en' | 'bn' | 'ja';

export const languageNames: Record<Language, string> = {
  en: 'English',
  bn: 'বাংলা',
  ja: '日本語',
};

export const supportedLanguages: Language[] = ['en', 'bn', 'ja'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
  });

export default i18n;