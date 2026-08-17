import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'molhub.darkMode';

interface ThemeModeContextValue {
  dark: boolean;
  setDark: (dark: boolean) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function getInitialDarkMode(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(getInitialDarkMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(dark));
  }, [dark]);

  return <ThemeModeContext.Provider value={{ dark, setDark }}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within a ThemeModeProvider');
  return ctx;
}
