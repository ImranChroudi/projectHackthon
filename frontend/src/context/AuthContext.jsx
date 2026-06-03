import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api, tokenStore, setUnauthorizedHandler, apiError } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Déconnexion forcée sur 401.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });
  }, [clearSession]);

  // Restaure la session au démarrage.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    tokenStore.set(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  // Déconnexion : respecte le verrou anti-fraude (423).
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      if (err.response?.status === 423) {
        toast.warning(apiError(err));
        return false; // déconnexion refusée
      }
    }
    clearSession();
    return true;
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
