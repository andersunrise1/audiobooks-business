import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { apiRequest } from '../services/api.js';

const STORAGE_KEY = 'techspeak_theme';
const PRIMARY_COLOR_KEY = 'techspeak_primary_color';
const FONT_SIZE_KEY = 'techspeak_font_size';
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export const PRIMARY_COLORS = ['blue', 'purple', 'green', 'red'];
export const FONT_SIZES = ['small', 'medium', 'large'];
const FONT_SIZE_PX = { small: '14px', medium: '16px', large: '18px' };

const ThemeContext = createContext(null);

function loadStoredTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
  } catch {
    return 'system';
  }
}

function loadStored(key, allowed, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return allowed.includes(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function ThemeProvider({ children }) {
  const { user, isAuthenticated, accessToken } = useAuth();
  const [theme, setTheme] = useState(loadStoredTheme);
  const [primaryColor, setPrimaryColorState] = useState(() =>
    loadStored(PRIMARY_COLOR_KEY, PRIMARY_COLORS, 'blue'),
  );
  const [fontSize, setFontSizeState] = useState(() =>
    loadStored(FONT_SIZE_KEY, FONT_SIZES, 'medium'),
  );
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

  useEffect(() => {
    if (primaryColor === 'blue') {
      document.documentElement.removeAttribute('data-primary');
    } else {
      document.documentElement.dataset.primary = primaryColor;
    }
    localStorage.setItem(PRIMARY_COLOR_KEY, primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_PX[fontSize];
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  // A logged-in user's color/font-size preference lives on their account
  // (Dia 68-69, users.theme_primary_color/theme_font_size) so it follows
  // them to another device/browser - adopted once per login (tracked by
  // user id) rather than on every user-object update, since refreshUser()
  // (e.g. after a payment) would otherwise clobber an unsaved local change
  // made earlier in the same session.
  const [hydratedUserId, setHydratedUserId] = useState(null);
  if (user && hydratedUserId !== user.id) {
    setHydratedUserId(user.id);
    if (PRIMARY_COLORS.includes(user.themePrimaryColor)) {
      setPrimaryColorState(user.themePrimaryColor);
    }
    if (FONT_SIZES.includes(user.themeFontSize)) {
      setFontSizeState(user.themeFontSize);
    }
  }

  async function saveThemePreferences(nextPrimaryColor, nextFontSize) {
    if (!isAuthenticated) return;
    try {
      await apiRequest('/api/user/theme', {
        method: 'PATCH',
        token: accessToken,
        body: { primaryColor: nextPrimaryColor, fontSize: nextFontSize },
      });
    } catch (err) {
      console.error('failed to save theme preference', err);
    }
  }

  function setPrimaryColor(color) {
    setPrimaryColorState(color);
    saveThemePreferences(color, fontSize);
  }

  function setFontSize(size) {
    setFontSizeState(size);
    saveThemePreferences(primaryColor, size);
  }

  const value = {
    theme,
    setTheme,
    isDark,
    primaryColor,
    setPrimaryColor,
    fontSize,
    setFontSize,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
