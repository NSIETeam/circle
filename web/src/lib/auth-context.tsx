'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
  broker_level?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: { phone: string; password: string; name: string; role: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      api.auth.me()
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await api.auth.login(phone, password);
    const { user, token } = res.data;
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  }, []);

  const register = useCallback(async (data: { phone: string; password: string; name: string; role: string }) => {
    const res = await api.auth.register(data);
    const { user, token } = res.data;
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
