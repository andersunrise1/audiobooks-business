import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'techspeak_theme';
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = createContext(null);

function loadStoredTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(loadStoredTheme);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DARK_MEDIA_QUERY).matches,
  );

  // Live-updates if the OS preference changes while the app is open and
  // the user hasn't overridden it with an explicit light/dark choice.
  useEffect(() => {
    const media = window.matchMedia(DARK_MEDIA_QUERY);
    function handleChange(event) {
      setSystemPrefersDark(event.matches);
    }
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const isDark = theme === 'system' ? systemPrefersDark : theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = { theme, setTheme, isDark };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
