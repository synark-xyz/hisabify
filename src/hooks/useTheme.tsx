import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { injectM3Theme, DEFAULT_SEED } from '@/lib/materialTheme';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isTheme,
  readStoredTheme,
  resolveTheme,
  type ResolvedTheme,
  type Theme,
} from '@/lib/theme';

export type { Theme, ResolvedTheme };

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  seedColor: string;
  setTheme: (theme: Theme) => void;
  setSeedColor: (hex: string) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const prefersDarkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Snapshot of what was persisted *before* this session wrote anything, so the
  // DB reconcile below can tell "user has chosen" from "we defaulted".
  const [storedAtMount] = useState(readStoredTheme);
  const [theme, setThemeState] = useState<Theme>(storedAtMount ?? DEFAULT_THEME);
  const [prefersDark, setPrefersDark] = useState(() => prefersDarkQuery().matches);

  const [seedColor, setSeedColorState] = useState<string>(() => {
    return localStorage.getItem('theme_seed_color') || DEFAULT_SEED;
  });

  const resolvedTheme = resolveTheme(theme, prefersDark);

  // Track the OS preference so `system` live-updates when the device flips.
  useEffect(() => {
    const mq = prefersDarkQuery();
    const handleChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    setPrefersDark(mq.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Apply to the DOM + persist locally. Deliberately ungated: the theme must be
  // correct on the first paint, offline and logged out included.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
    // Edge-to-edge: the system bars are transparent from Android 15, so their icons sit on
    // the app's own background. Capacitor derives their contrast from the *device* night
    // mode, which is wrong whenever the in-app theme disagrees with it — light icons on a
    // light page are invisible. Style follows resolvedTheme; a no-op on web.
    SystemBars.setStyle({ style: resolvedTheme === 'dark' ? SystemBarsStyle.DARK : SystemBarsStyle.LIGHT })
      .catch(() => { /* not native, or no system bars — nothing to style */ });
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // storage unavailable — the in-memory theme still applies
    }
  }, [theme, resolvedTheme]);

  // Reconcile with the server copy once. Best-effort: any failure leaves the
  // locally-applied theme alone.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user || cancelled) return;

        const { data, error } = await supabase
          .from('users')
          .select('theme')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error || cancelled) return;

        if (storedAtMount) {
          // This device has an explicit choice — it wins; push it up if stale.
          if (data?.theme !== storedAtMount) {
            await supabase.from('users').update({ theme: storedAtMount }).eq('user_id', user.id);
          }
        } else if (isTheme(data?.theme)) {
          // Fresh install / second device: adopt the account's choice.
          setThemeState(data.theme);
        }
      } catch (err) {
        console.warn('Theme reconcile failed:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [storedAtMount]);

  // Inject M3 CSS vars whenever seed or dark/light changes
  useEffect(() => {
    injectM3Theme(seedColor, resolvedTheme === 'dark');
  }, [seedColor, resolvedTheme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) return;
        return supabase.from('users').update({ theme: t }).eq('user_id', user.id);
      })
      .catch((err) => console.warn('Theme sync failed:', err));
  }, []);

  const setSeedColor = (hex: string) => {
    setSeedColorState(hex);
    localStorage.setItem('theme_seed_color', hex);
  };

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

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
