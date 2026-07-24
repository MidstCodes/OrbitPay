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
      className={`
        flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-md
        transition-all duration-300 ease-in-out
        ${typeStyles[toast.type] || typeStyles.info}
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isLeaving ? 'translate-x-full opacity-0' : ''}
        max-w-md w-full
      `}
    >
      <span
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          text-sm font-bold
          ${typeIconColors[toast.type] || typeIconColors.info}
        `}
        aria-hidden="true"
      >
        {typeIcons[toast.type] || typeIcons.info}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-gray-600 text-sm mt-0.5">{toast.message}</p>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                   text-gray-400 hover:text-gray-600 hover:bg-gray-200
                   transition-colors duration-150"
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
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
