import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { ToastContainer, useToast } from './Toast';

interface ToastContextType {
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { toasts, removeToast, showSuccess, showError, showInfo, showWarning } = useToast();
  // One stable object: a new one per render re-rendered every consumer on every toast.
  const value = useMemo(
    () => ({ showSuccess, showError, showInfo, showWarning }),
    [showSuccess, showError, showInfo, showWarning],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </ToastContext.Provider>
  );
};
