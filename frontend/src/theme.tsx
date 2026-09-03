import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';

const STORAGE_KEY = 'molhub.darkMode';

export interface Palette {
  bg: string;
  surface: string;
  surfaceSubtle: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryHover: string;
}

// Calm, muted palette — one restrained teal accent instead of Ant Design's
// stock saturated blue, plus neutral surfaces so cards read as "flat with
// contrast" rather than bordered/shadowed.
export const palette: { light: Palette; dark: Palette } = {
  light: {
    bg: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceSubtle: '#EEF1F3',
    border: '#E1E5E9',
    text: '#1E252B',
    textSecondary: '#5B6670',
    primary: '#3B6E71',
    primaryHover: '#2E5A5C',
  },
  dark: {
    bg: '#14181B',
    surface: '#1C2226',
    surfaceSubtle: '#242B30',
    border: '#2B3339',
    text: '#E8EBED',
    textSecondary: '#93A0A8',
    primary: '#5FA8A0',
    primaryHover: '#7BBAB3',
  },
};

// Exposes the active palette as CSS custom properties so plain CSS (e.g.
// index.css) can stay in sync with the same values driving the AntD theme
// tokens, without duplicating the color list. Applied inline on the root
// layout element so it's synchronous with the `dark` state on first paint
// (no flash-of-wrong-theme from a useEffect running after mount).
export function paletteCssVars(p: Palette): CSSProperties {
  return {
    '--mh-bg': p.bg,
    '--mh-surface': p.surface,
    '--mh-surface-subtle': p.surfaceSubtle,
    '--mh-border': p.border,
    '--mh-text': p.text,
    '--mh-text-secondary': p.textSecondary,
    '--mh-primary': p.primary,
    '--mh-primary-hover': p.primaryHover,
  } as CSSProperties;
}

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
