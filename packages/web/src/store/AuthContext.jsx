import { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest, API_URL } from '../services/api.js';
import { setDesktopSession } from '../services/desktopBridge.js';

const STORAGE_KEY = 'techspeak_auth';

const AuthContext = createContext(null);

function loadStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth);

  useEffect(() => {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
      setDesktopSession({ apiUrl: API_URL, token: auth.accessToken });
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setDesktopSession(null);
    }
  }, [auth]);

  async function login(email, password) {
    const data = await apiRequest('/api/auth/login', { method: 'POST', body: { email, password } });
    setAuth(data);
    return data;
  }

  async function register(email, password, name) {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { email, password, name },
    });
    setAuth(data);
    return data;
  }

  function logout() {
    setAuth(null);
  }

  const value = {
    user: auth?.user ?? null,
    accessToken: auth?.accessToken ?? null,
    isAuthenticated: Boolean(auth?.accessToken),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
