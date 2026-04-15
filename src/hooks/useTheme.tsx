import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'dark' | 'light';
export type ThemeVariant = 'default' | 'cyberpunk';

interface ThemeContextType {
  theme: Theme;
  variant: ThemeVariant;
  setTheme: (theme: Theme) => void;
  setVariant: (variant: ThemeVariant) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme;
    return stored || 'dark';
  });

  const [variant, setVariantState] = useState<ThemeVariant>(() => {
    const stored = localStorage.getItem('theme_variant') as ThemeVariant;
    return stored || 'default';
  });

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initTheme = async () => {
      const stored = localStorage.getItem('theme') as Theme;
      const hasExplicitChoice = stored && ['dark', 'light'].includes(stored);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsInitialized(true);
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('theme, theme_variant')
        .eq('user_id', user.id)
        .single();

      if (hasExplicitChoice) {
        setThemeState(stored);
        const storedVariant = localStorage.getItem('theme_variant') as ThemeVariant;
        if (storedVariant) setVariantState(storedVariant);

        if (data?.theme && data.theme !== stored) {
          await supabase
            .from('users')
            .update({ theme: stored })
            .eq('user_id', user.id);
        }
        if (data?.theme_variant && storedVariant && data.theme_variant !== storedVariant) {
          await supabase
            .from('users')
            .update({ theme_variant: storedVariant })
            .eq('user_id', user.id);
        }
      } else if (data?.theme && ['dark', 'light'].includes(data.theme)) {
        setThemeState(data.theme);
        localStorage.setItem('theme', data.theme);
        if (data?.theme_variant && ['default', 'cyberpunk'].includes(data.theme_variant)) {
          setVariantState(data.theme_variant);
          localStorage.setItem('theme_variant', data.theme_variant);
        }
      }

      setIsInitialized(true);
    };

    initTheme();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('users')
          .update({ theme })
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Theme sync failed:', error);
          });
      }
    });
  }, [theme, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    const root = document.documentElement;
    if (variant === 'default') {
      root.removeAttribute('data-variant');
    } else {
      root.setAttribute('data-variant', variant);
    }
    localStorage.setItem('theme_variant', variant);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('users')
          .update({ theme_variant: variant })
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Theme variant sync failed:', error);
          });
      }
    });
  }, [variant, isInitialized]);

  const setTheme = (newTheme: Theme) => setThemeState(newTheme);
  const setVariant = (newVariant: ThemeVariant) => setVariantState(newVariant);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, variant, setTheme, setVariant, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

