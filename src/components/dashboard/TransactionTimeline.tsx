'use client';

/**
 * Transaction timeline component for OrbitPay.
 * Displays the lifecycle of a transaction from preparation to confirmation.
 */

import React from 'react';
import { TransactionLifecycle, TransactionState } from '@/types';
import { TransactionStateBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime, truncateHash } from '@/lib/utils';

interface TransactionTimelineProps {
  transactions: TransactionLifecycle[];
  loading?: boolean;
}

const timelineSteps: { state: TransactionState; label: string; description: string }[] = [
  { state: 'preparing', label: 'Preparing', description: 'Validating inputs and building transaction' },
  { state: 'submitting', label: 'Submitting', description: 'Sending transaction to the Stellar network' },
  { state: 'pending', label: 'Pending', description: 'Waiting for network confirmation' },
  { state: 'confirmed', label: 'Confirmed', description: 'Transaction confirmed on-chain' },
];

function TransactionStep({
  step,
  isActive,
  isCompleted,
  isFailed,
  timestamp,
}: {
  step: typeof timelineSteps[0];
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  timestamp?: number;
}) {
  let icon: string;
  let borderClass: string;
  let bgClass: string;

  if (isFailed && isActive) {
    icon = '✕';
    borderClass = 'border-red-500';
    bgClass = 'bg-red-100 text-red-600';
  } else if (isCompleted) {
    icon = '✓';
    borderClass = 'border-emerald-500';
    bgClass = 'bg-emerald-100 text-emerald-600';
  } else if (isActive) {
    icon = '●';
    borderClass = 'border-blue-500';
    bgClass = 'bg-blue-100 text-blue-600';
  } else {
    icon = '○';
    borderClass = 'border-gray-200';
    bgClass = 'bg-gray-50 text-gray-300';
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${borderClass} ${bgClass} transition-all duration-200`}>
          {icon}
        </div>
        {!isFailed && (
          <div className={`w-0.5 h-8 ${isCompleted ? 'bg-emerald-200' : 'bg-gray-200'}`} />
        )}
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${isCompleted ? 'text-gray-900' : isActive ? 'text-blue-700' : 'text-gray-400'}`}>
            {step.label}
          </p>
          {isActive && !isCompleted && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>
        <p className={`text-xs mt-0.5 ${isCompleted ? 'text-gray-500' : 'text-gray-400'}`}>
          {step.description}
        </p>
        {timestamp && (
          <p className="text-xs text-gray-400 mt-0.5">{formatRelativeTime(timestamp)}</p>
        )}
      </div>
    </div>
  );
}

function TransactionCard({ tx }: { tx: TransactionLifecycle }) {
  const isFailed = tx.state === 'failed' || tx.state === 'rejected' || tx.state === 'timed_out';

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">
            {tx.hash ? truncateHash(tx.hash) : `Pending...`}
          </span>
        </div>
        <TransactionStateBadge state={tx.state} />
      </div>

      <div className="space-y-0">
        {timelineSteps.map((step) => {
          const stepOrder = timelineSteps.findIndex((s) => s.state === step.state);
          const currentOrder = timelineSteps.findIndex((s) => s.state === tx.state);
          const isActiveStep = step.state === tx.state;
          const isCompletedStep = stepOrder < currentOrder && !isFailed;
          const isFailedStep = isFailed && isActiveStep;

          return (
            <TransactionStep
              key={step.state}
              step={step}
              isActive={isActiveStep}
              isCompleted={isCompletedStep}
              isFailed={isFailedStep}
              timestamp={tx.startedAt}
            />
          );
        })}
      </div>

      {tx.error && (
        <div className="mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-600">
          {tx.error}
        </div>
      )}

      {tx.explorerUrl && (
        <a
          href={tx.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
        >
          View on Explorer ↗
        </a>
      )}
    </div>
  );
}

export function TransactionTimeline({ transactions, loading = false }: TransactionTimelineProps) {
  // Show only recent active transactions
  const recentTxs = transactions.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Transaction Timeline</h3>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))
        ) : recentTxs.length === 0 ? (
          <EmptyState
            variant="compact"
            title="No recent transactions"
            description="Payment operations will appear here"
          />
        ) : (
          recentTxs.map((tx) => (
            <TransactionCard key={tx.id} tx={tx} />
          ))
        )}
      </div>
    </div>
  );
}
