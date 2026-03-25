import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { defaultLogoBase64 } from '../assets/defaultLogo';

interface LogoContextType {
  logo: string;
  setLogo: (logoBase64: string) => void;
  resetLogo: () => void;
}

const LogoContext = createContext<LogoContextType | undefined>(undefined);

const STORAGE_KEY = 'app_logo';

export const LogoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logo, setLogo] = useState<string>(defaultLogoBase64);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setLogo(stored || defaultLogoBase64);
    } catch (e) {
      console.error('Failed to load logo from local storage', e);
      setLogo(defaultLogoBase64);
    }
  }, []);

  const handleSetLogo = (logoBase64: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, logoBase64);
      setLogo(logoBase64);
    } catch(e) {
      console.error('Failed to save logo to local storage', e);
    }
  };

  const resetLogo = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLogo(defaultLogoBase64);
    } catch(e) {
      console.error('Failed to remove logo from local storage', e);
    }
  }

  return (
    <LogoContext.Provider value={{ logo, setLogo: handleSetLogo, resetLogo }}>
      {children}
    </LogoContext.Provider>
  );
};

export const useLogo = () => {
  const context = useContext(LogoContext);
  if (context === undefined) {
    throw new Error('useLogo must be used within a LogoProvider');
  }
  return context;
};
