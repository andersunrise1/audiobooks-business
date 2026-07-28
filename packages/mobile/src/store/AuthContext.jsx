import { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../services/api.js';
import { loadStoredAuth, saveStoredAuth } from '../services/storage.js';

const AuthContext = createContext(null);

// Unlike the web version (packages/web/src/store/AuthContext.jsx), which
// reads localStorage synchronously in useState's initializer, AsyncStorage
// is always async - auth starts as "unknown" (isReady: false) until the
// stored value has actually been read, so the navigator (below) doesn't
// briefly flash the login screen for an already-authenticated user on
// cold start.
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadStoredAuth().then((stored) => {
      setAuth(stored);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (isReady) {
      saveStoredAuth(auth);
    }
  }, [auth, isReady]);

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
    isReady,
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
