import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

type User = { id: string; mobile: string; role: string } | null;

interface AuthContextValue {
  user: User;
  loading: boolean;
  requestOtp: (mobile: string) => Promise<void>;
  verifyOtp: (mobile: string, code: string, intendedRole?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
      setLoading(false);
    })();
  }, []);

  async function requestOtp(mobile: string) {
    await api.post('/auth/otp/request', { mobile });
  }

  async function verifyOtp(mobile: string, code: string, intendedRole?: string) {
    const { data } = await api.post('/auth/otp/verify', { mobile, code, intendedRole });
    await AsyncStorage.multiSet([
      ['accessToken', data.accessToken],
      ['refreshToken', data.refreshToken],
      ['user', JSON.stringify(data.user)],
    ]);
    setUser(data.user);
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
