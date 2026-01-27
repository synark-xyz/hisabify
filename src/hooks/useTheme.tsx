import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

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

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (variant === 'default') {
      root.removeAttribute('data-variant');
    } else {
      root.setAttribute('data-variant', variant);
    }
    localStorage.setItem('theme_variant', variant);
  }, [variant]);

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

