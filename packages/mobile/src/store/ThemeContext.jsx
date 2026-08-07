import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'techspeak_theme';
const MODES = ['light', 'dark', 'system'];

// Same light/dark/system model as packages/web/src/store/ThemeContext.jsx,
// scoped down to just the color-scheme toggle (no per-user primary
// color/font size - that's a bigger web-only feature, not what was
// reported missing here). Colors mirror the web app's stone/slate palette
// and #1c1917 brand background (Dia 66-69/91-100's icon work) so dark mode
// looks like the same product, not a different app.
const LIGHT_COLORS = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
};

const DARK_COLORS = {
  background: '#1c1917',
  card: '#292524',
  text: '#f5f5f4',
  muted: '#a8a29e',
  border: '#44403c',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (MODES.includes(stored)) setThemeState(stored);
      setIsReady(true);
    });
  }, []);

  function setTheme(next) {
    setThemeState(next);
    if (isReady) AsyncStorage.setItem(STORAGE_KEY, next);
  }

  function cycleTheme() {
    setTheme(MODES[(MODES.indexOf(theme) + 1) % MODES.length]);
  }

  const isDark = theme === 'system' ? systemScheme === 'dark' : theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const value = { theme, setTheme, cycleTheme, isDark, colors };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
