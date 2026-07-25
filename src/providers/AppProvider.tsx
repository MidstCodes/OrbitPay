'use client';

/**
 * AppProvider - Global application context.
 * Provides toast notifications, event streaming, and shared state.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastMessage } from '@/types';
import { generateId } from '@/lib/utils';
import { ToastContainer } from '@/components/ui/Toast';

// ============================================================================
// Toast Context
// ============================================================================

interface ToastContextValue {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'> | ToastMessage) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  success: (title: string, message: string) => void;
  error: (title: string, message: string) => void;
  info: (title: string, message: string) => void;
  warning: (title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access toast notifications from any component.
 * Must be used within an AppProvider.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // Provide a fallback for components that might render outside AppProvider
    return {
      toasts: [],
      addToast: () => {},
      removeToast: () => {},
      clearToasts: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
    };
  }
  return context;
}

// ============================================================================
// App Provider Component
// ============================================================================

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'> | ToastMessage) => {
    const id = 'id' in toast ? toast.id : generateId();
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const toastDuration = newToast.duration ?? 5000;
    if (toastDuration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toastDuration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback(
    (title: string, message: string) => {
      addToast({ type: 'success', title, message });
    },
    [addToast],
  );

  const error = useCallback(
    (title: string, message: string) => {
      addToast({ type: 'error', title, message });
    },
    [addToast],
  );

  const info = useCallback(
    (title: string, message: string) => {
      addToast({ type: 'info', title, message });
    },
    [addToast],
  );

  const warning = useCallback(
    (title: string, message: string) => {
      addToast({ type: 'warning', title, message });
    },
    [addToast],
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        clearToasts,
        success,
        error,
        info,
        warning,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// Re-export for convenience
export { ToastContainer };
