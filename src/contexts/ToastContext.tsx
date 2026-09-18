import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: ((type: ToastMessage['type'], title: string, message?: string) => void) & ((title: string, type?: ToastMessage['type']) => void);
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((first: any, second?: any, third?: any) => {
    let type: ToastMessage['type'] = 'info';
    let title = '';
    let message: string | undefined = undefined;

    const validTypes = new Set(['success', 'error', 'info', 'warning']);

    if (validTypes.has(first)) {
      type = first;
      title = String(second || '');
      message = third ? String(third) : undefined;
    } else if (validTypes.has(second)) {
      type = second;
      title = String(first || '');
      message = third ? String(third) : undefined;
    } else {
      title = String(first || '');
      message = second ? String(second) : undefined;
    }

    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newToast: ToastMessage = { id, type, title, message };
    
    // Keep max 3 newest toasts
    setToasts((prev) => [...prev.slice(-2), newToast]);

    // Fast auto-dismiss after 3.2 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3200);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
