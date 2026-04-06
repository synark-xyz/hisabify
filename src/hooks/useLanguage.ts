import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Language, languageNames } from '@/i18n';

const STORAGE_KEY = 'language';

export function useLanguage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  const detectInitialLanguage = useCallback((): Language => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ['en', 'bn', 'ja'].includes(stored)) {
      return stored as Language;
    }

    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('bn')) return 'bn';
    if (browserLang.startsWith('ja')) return 'ja';
    return 'en';
  }, []);

  useEffect(() => {
    const initLanguage = async () => {
      // Check if user explicitly set a language (stored in localStorage)
      const storedLang = localStorage.getItem(STORAGE_KEY);
      const hasExplicitChoice = storedLang && ['en', 'bn', 'ja'].includes(storedLang);

      const initialLang = hasExplicitChoice
        ? (storedLang as Language)
        : detectInitialLanguage();

      await i18n.changeLanguage(initialLang);
      localStorage.setItem(STORAGE_KEY, initialLang);
      setCurrentLanguage(initialLang);

      if (user) {
        const { data } = await supabase
          .from('users')
          .select('language')
          .eq('user_id', user.id)
          .single();

        if (hasExplicitChoice) {
          // User explicitly picked a language — it wins. Sync DB to it.
          if (data?.language !== initialLang) {
            await supabase
              .from('users')
              .update({ language: initialLang })
              .eq('user_id', user.id);
          }
        } else if (data?.language && ['en', 'bn', 'ja'].includes(data.language)) {
          // No local preference — pull from DB (cross-device sync)
          const dbLang = data.language as Language;
          await i18n.changeLanguage(dbLang);
          localStorage.setItem(STORAGE_KEY, dbLang);
          setCurrentLanguage(dbLang);
        }
      }

      setIsLoading(false);
    };

    initLanguage();
  }, [user, i18n, detectInitialLanguage]);

  const setLanguage = useCallback(async (lang: Language) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    setCurrentLanguage(lang);

    if (user) {
      await supabase
        .from('users')
        .update({ language: lang })
        .eq('user_id', user.id);
    }
  }, [i18n, user]);

  return {
    language: currentLanguage,
    setLanguage,
    isLoading,
  };
}

export function getLanguageLocale(lang: Language): string {
  switch (lang) {
    case 'bn':
      return 'bn-BD';
    case 'ja':
      return 'ja-JP';
    default:
      return 'en-US';
  }
}

export { languageNames };