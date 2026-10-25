import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(getToken()));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // Si el servidor responde 401 en cualquier llamada, se cierra la sesion.
  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  // Al cargar la pagina, recupera la sesion guardada.
  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
  }, []);

  const authenticate = useCallback(async (mode, form) => {
    const { token, user } = await api[mode](form);
    setToken(token);
    setUser(user);
  }, []);

  const value = useMemo(
    () => ({
      user,
      booting,
      login: (form) => authenticate('login', form),
      register: (form) => authenticate('register', form),
      logout,
    }),
    [user, booting, authenticate, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
