import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Admin } from '../types';
import apiService from '../utils/apiService';

interface AuthContextType {
  user: Admin | null;
  admin: Admin | null;
  isLoading: boolean;
  signIn: (email: string, password?: string, forceLogin?: boolean) => Promise<{ error: string | null; code?: string; lastLoginAt?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      apiService.getCurrentUser()
        .then(user => {
          if (user) {
            setAdmin(user);
          } else {
            localStorage.removeItem('authToken');
          }
        })
        .catch(() => {
          localStorage.removeItem('authToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password?: string, forceLogin?: boolean) => {
    try {
      const result = await apiService.login(email, password, forceLogin);
      if (result.user) {
        setAdmin(result.user);
      }
      return { error: null };
    } catch (error: any) {
      return { 
        error: error.message || 'An unknown error occurred',
        code: error.code,
        lastLoginAt: error.lastLoginAt
      };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      await apiService.signup(email, password, displayName);
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'An unknown error occurred' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await apiService.logout();
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user: admin, admin, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
