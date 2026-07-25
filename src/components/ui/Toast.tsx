'use client';

/**
 * Toast notification components for OrbitPay.
 * Provides ToastItem and ToastContainer for displaying notifications.
 */

import React, { useEffect, useState } from 'react';
import { ToastMessage } from '@/types';

// ============================================================================
// Individual Toast Item
// ============================================================================

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const typeStyles: Record<string, string> = {
  success: 'border-emerald-500 bg-emerald-50 shadow-emerald-200',
  error: 'border-red-500 bg-red-50 shadow-red-200',
  info: 'border-blue-500 bg-blue-50 shadow-blue-200',
  warning: 'border-amber-500 bg-amber-50 shadow-amber-200',
};

const typeIcons: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const typeIconColors: Record<string, string> = {
  success: 'text-emerald-500 bg-emerald-100',
  error: 'text-red-500 bg-red-100',
  info: 'text-blue-500 bg-blue-100',
  warning: 'text-amber-500 bg-amber-100',
};

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-lg border-l-4 p-4 shadow-md transition-all duration-300 ease-in-out ${typeStyles[toast.type] || typeStyles.info} ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} ${isLeaving ? 'translate-x-full opacity-0' : ''} w-full max-w-md`}
    >
      <span
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${typeIconColors[toast.type] || typeIconColors.info} `}
        aria-hidden="true"
      >
        {typeIcons[toast.type] || typeIcons.info}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-sm text-gray-600">{toast.message}</p>}
      </div>

      <button
        onClick={handleDismiss}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors duration-150 hover:bg-gray-200 hover:text-gray-600"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

// ============================================================================
// Toast Container
// ============================================================================

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
