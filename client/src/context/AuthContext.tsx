import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/client';

interface User {
  id: string;
  email: string;
  username?: string;
  profile_picture?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  needsProfile: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setNeedsProfile: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const persistToken = (t: string) => {
    localStorage.setItem('trimers_token', t);
    setToken(t);
  };

  const refreshUser = async () => {
    const t = localStorage.getItem('trimers_token');
    if (!t) {
      setLoading(false);
      return;
    }
    setToken(t);
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      localStorage.removeItem('trimers_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const { token: t, needsProfile: np } = await authApi.login(email, password);
    persistToken(t);
    setNeedsProfile(np);
    await refreshUser();
  };

  const register = async (email: string, password: string) => {
    const { token: t, needsProfile: np } = await authApi.register(email, password);
    persistToken(t);
    setNeedsProfile(np);
    await refreshUser();
  };

  const logout = () => {
    localStorage.removeItem('trimers_token');
    setToken(null);
    setUser(null);
    setNeedsProfile(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        needsProfile,
        loading,
        login,
        register,
        logout,
        refreshUser,
        setNeedsProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
