import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useRef } from 'react';
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

  const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
  const timeoutRef = useRef<number | null>(null);

  const signOut = useCallback(async () => {
    try {
      await apiService.logout();
    } catch (err) {
      // Logout endpoint may return 401 if the session was already replaced.
      // Ensure client clears local session state regardless so UI reflects logged-out status.
      console.warn('Logout request failed or session already expired; clearing local session state.');
    }
    localStorage.removeItem('authToken');
    setAdmin(null);
  }, []);

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

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const resetTimer = () => {
      try { localStorage.setItem('lastActivity', String(Date.now())); } catch (e) {}
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      // @ts-ignore
      timeoutRef.current = window.setTimeout(() => {
        // auto sign out on inactivity
        signOut().catch(() => {});
        try { alert('You have been logged out due to 2 hours of inactivity.'); } catch (e) {}
      }, INACTIVITY_TIMEOUT_MS);
    };

    // On mount check lastActivity
    const last = parseInt(localStorage.getItem('lastActivity') || '0', 10);
    if (last && Date.now() - last > INACTIVITY_TIMEOUT_MS) {
      // expired due to inactivity
      signOut().catch(() => {});
      return;
    }

    resetTimer();
    const handler = () => resetTimer();
    events.forEach(ev => window.addEventListener(ev, handler));
    return () => {
      events.forEach(ev => window.removeEventListener(ev, handler));
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [signOut]);

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
