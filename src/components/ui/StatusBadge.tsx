'use client';

/**
 * Status badge component for OrbitPay.
 * Displays payment status and transaction state with appropriate colors.
 */

import React from 'react';
import { getStatusColor, getStatusLabel, getTransactionStateColor } from '@/lib/utils';
import { PaymentStatus, TransactionState } from '@/types';

// ============================================================================
// Payment Status Badge
// ============================================================================

interface StatusBadgeProps {
  status: PaymentStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

const statusIcons: Record<string, string> = {
  Pending: '⏳',
  Confirmed: '✓',
  Cancelled: '✕',
};

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border
        transition-colors duration-200
        ${getStatusColor(status)}
        ${sizeClasses[size]}
      `}
      role="status"
      aria-label={`Status: ${getStatusLabel(status)}`}
    >
      {showIcon && (
        <span aria-hidden="true" className="text-current opacity-75">
          {statusIcons[status] || '●'}
        </span>
      )}
      {getStatusLabel(status)}
    </span>
  );
}

// ============================================================================
// Transaction State Badge
// ============================================================================

interface TransactionStateBadgeProps {
  state: TransactionState;
}

const stateLabels: Record<string, string> = {
  idle: 'Idle',
  preparing: 'Preparing',
  awaiting_approval: 'Awaiting Approval',
  signing: 'Signing',
  submitting: 'Submitting',
  pending: 'Pending',
  confirmed: 'Confirmed',
  failed: 'Failed',
  rejected: 'Rejected',
  timed_out: 'Timed Out',
};

const stateColors: Record<string, string> = {
  idle: 'bg-gray-100 text-gray-600 border-gray-200',
  preparing: 'bg-blue-50 text-blue-700 border-blue-200',
  awaiting_approval: 'bg-purple-50 text-purple-700 border-purple-200',
  signing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  submitting: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  pending: 'bg-orange-50 text-orange-700 border-orange-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  timed_out: 'bg-slate-50 text-slate-700 border-slate-200',
};

export function TransactionStateBadge({ state }: TransactionStateBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
        text-xs font-medium border
        transition-colors duration-200
        ${stateColors[state] || stateColors.idle}
      `}
      role="status"
      aria-label={`Transaction state: ${stateLabels[state] || state}`}
    >
      {state === 'submitting' || state === 'pending' ? (
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" aria-hidden="true" />
      ) : null}
      {stateLabels[state] || state}
    </span>
  );
}
