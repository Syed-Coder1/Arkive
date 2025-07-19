import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { auth } from '../services/auth';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string, role?: 'admin' | 'employee') => Promise<User>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await auth.init();
        setUser(auth.getCurrentUser());
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const user = await auth.login(username, password);
    setUser(user);
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
  };

  const register = async (username: string, password: string, role: 'admin' | 'employee' = 'employee') => {
    return await auth.register(username, password, role);
  };

  const value = {
    user,
    login,
    logout,
    register,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}