import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { injectM3Theme, DEFAULT_SEED } from '@/lib/materialTheme';

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  seedColor: string;
  setTheme: (theme: Theme) => void;
  setSeedColor: (hex: string) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'dark';
  });

  const [seedColor, setSeedColorState] = useState<string>(() => {
    return localStorage.getItem('theme_seed_color') || DEFAULT_SEED;
  });

  const [isInitialized, setIsInitialized] = useState(false);

  const resolveTheme = useCallback((t: Theme): ResolvedTheme => {
    if (t === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return t as ResolvedTheme;
  }, []);

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));

  useEffect(() => {
    setResolvedTheme(resolveTheme(theme));
  }, [theme, resolveTheme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') setResolvedTheme(resolveTheme('system'));
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [theme, resolveTheme]);

  // Load persisted theme from DB on mount
  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('theme') as Theme;
      const hasExplicit = stored && ['dark', 'light', 'system'].includes(stored);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsInitialized(true); return; }

      const { data } = await supabase
        .from('users')
        .select('theme')
        .eq('user_id', user.id)
        .single();

      if (hasExplicit) {
        setThemeState(stored);
        if (data?.theme && data.theme !== stored) {
          await supabase.from('users').update({ theme: stored }).eq('user_id', user.id);
        }
      } else if (data?.theme && ['dark', 'light', 'system'].includes(data.theme)) {
        setThemeState(data.theme as Theme);
        localStorage.setItem('theme', data.theme);
      }

      setIsInitialized(true);
    };
    init();
  }, []);

  // Apply theme class to DOM + sync to DB
  useEffect(() => {
    if (!isInitialized) return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    localStorage.setItem('theme', theme);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('users').update({ theme }).eq('user_id', user.id)
          .then(({ error }) => { if (error) console.warn('Theme sync failed:', error); });
      }
    });
  }, [theme, resolvedTheme, isInitialized]);

  // Inject M3 CSS vars whenever seed or dark/light changes
  useEffect(() => {
    injectM3Theme(seedColor, resolvedTheme === 'dark');
  }, [seedColor, resolvedTheme]);

  const setTheme = (t: Theme) => setThemeState(t);

  const setSeedColor = (hex: string) => {
    setSeedColorState(hex);
    localStorage.setItem('theme_seed_color', hex);
  };

  const toggleTheme = () => {
    const effective = theme === 'system' ? resolvedTheme : theme;
    setThemeState(effective === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, seedColor, setTheme, setSeedColor, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
