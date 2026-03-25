import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error';

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
  hideToast: () => void;
  toast: { message: string; type: ToastType; isVisible: boolean } | null;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean } | null>(null);

  const hideToast = useCallback(() => {
    setToast(prev => prev ? { ...prev, isVisible: false } : null);
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => {
      hideToast();
    }, 5000);
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};
