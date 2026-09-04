export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'theme';
export const DEFAULT_THEME: Theme = 'dark';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system';
}

/** 'system' resolves against the OS preference; anything unrecognised falls back to DEFAULT_THEME. */
export function resolveTheme(stored: unknown, prefersDark: boolean): ResolvedTheme {
  const theme = isTheme(stored) ? stored : DEFAULT_THEME;
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme;
}

/** The user's explicit choice, or null when they have never made one. */
export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    // ponytail: private-mode / disabled storage — behave as "never chosen"
    return null;
  }
}
