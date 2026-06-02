import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ThemeContext = createContext(undefined);

const STORAGE_KEY = 'alpha-admin-theme';          // 'light' | 'dark' | 'system'
const VALID = ['light', 'dark', 'system'];

const getSystemTheme = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

const getStoredPreference = () => {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

/**
 * Applies the resolved theme to <html>: toggles .dark/.light + data-theme,
 * sets color-scheme (native form controls / scrollbars) and the PWA
 * theme-color meta so the status bar matches the surface.
 */
const applyResolvedTheme = (resolved) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0A0507' : '#F4F6F9');
};

export const ThemeProvider = ({ children }) => {
  // User preference (what they chose). Default = AUTO (follows the OS).
  const [theme, setThemeState] = useState(getStoredPreference);
  // Concrete theme actually painted ('light' | 'dark').
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    getStoredPreference() === 'system' ? getSystemTheme() : getStoredPreference()
  );

  // Resolve + apply whenever the preference changes.
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    applyResolvedTheme(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable (private mode) — runtime still works */
    }
  }, [theme]);

  // Live-follow the OS while in 'system' mode.
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const resolved = mq.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyResolvedTheme(resolved);
    };
    // addEventListener with a Safari < 14 fallback.
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, [theme]);

  const setTheme = useCallback((pref) => {
    setThemeState(VALID.includes(pref) ? pref : 'system');
  }, []);

  // Quick toggle: flips to the opposite of what's currently shown and
  // pins it explicitly (escapes 'system').
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const current = prev === 'system' ? getSystemTheme() : prev;
      return current === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, isDark: resolvedTheme === 'dark', setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
