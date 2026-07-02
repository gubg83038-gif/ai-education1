import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserAccount } from '../types';
import { getCurrentUser, login as storeLogin, register as storeRegister, logout as storeLogout, migrateLegacyData } from '../data/store';

interface AuthContextType {
  user: UserAccount | null;
  loading: boolean;
  login: (username: string, password: string) => { success: boolean; error?: string };
  register: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => ({ success: false }),
  register: () => ({ success: false }),
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    migrateLegacyData();
    const u = getCurrentUser();
    setUser(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
  }, [refreshKey]);

  const login = useCallback((username: string, password: string) => {
    const result = storeLogin(username, password);
    if (result) {
      setUser(result);
      return { success: true };
    }
    return { success: false, error: '用户名或密码错误' };
  }, []);

  const register = useCallback((username: string, password: string) => {
    if (username.length < 2) return { success: false, error: '用户名至少2个字符' };
    if (password.length < 4) return { success: false, error: '密码至少4个字符' };
    const result = storeRegister(username, password);
    if (result) {
      setUser(result);
      return { success: true };
    }
    return { success: false, error: '用户名已被占用' };
  }, []);

  const logout = useCallback(() => {
    storeLogout();
    setUser(null);
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
