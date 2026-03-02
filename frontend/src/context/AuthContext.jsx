import { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setUser(null);
    setRole(null);
    setToken(null);
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      const stored = localStorage.getItem('token');
      if (!stored) {
        setLoading(false);
        return;
      }
      setToken(stored);
      try {
        const res = await authService.getMe();
        setUser(res.data);
        const resolvedRole = (res.data.role || localStorage.getItem('role') || '').toString().toLowerCase();
        setRole(resolvedRole || null);
        if (resolvedRole) localStorage.setItem('role', resolvedRole);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setToken(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    const accessToken = res.data?.tokens?.access;
    const refreshToken = res.data?.tokens?.refresh;
    const userObj = res.data?.user;

    const resolvedRole = (userObj?.role || '').toString().toLowerCase();

    if (accessToken) {
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
    }
    if (refreshToken) {
      localStorage.setItem('refresh', refreshToken);
    }
    if (resolvedRole) {
      localStorage.setItem('role', resolvedRole);
      setRole(resolvedRole);
    }

    setUser(userObj || { email });
    return resolvedRole;
  };

  return (
    <AuthContext.Provider value={{ user, role, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
