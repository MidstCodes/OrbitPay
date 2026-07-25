'use client';

/**
 * Empty state component for OrbitPay.
 * Displays a helpful message when there's no data to show.
 */

import React, { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'compact';
}

const defaultIcon = (
  <svg
    className="h-12 w-12 text-gray-300"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
    />
  </svg>
);

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div
        className="flex flex-col items-center justify-center px-4 py-8 text-center"
        role="status"
      >
        <div className="mb-2 text-gray-300">{icon || defaultIcon}</div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {description && <p className="mt-1 text-xs text-gray-400">{description}</p>}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center"
      role="status"
    >
      <div className="mb-4 text-gray-300">{icon || defaultIcon}</div>
      <h3 className="mb-1 text-lg font-semibold text-gray-700">{title}</h3>
      {description && <p className="mb-4 max-w-md text-sm text-gray-500">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
