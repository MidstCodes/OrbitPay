'use client';

/**
 * Payment tracker component for OrbitPay.
 * Displays a table of payments with filtering, search, sorting, and action buttons.
 */

import React, { useState } from 'react';
import { Payment, PaymentStatus } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PaymentListSkeleton } from '@/components/ui/LoadingSkeleton';
import { truncateAddress, formatAmount, formatRelativeTime } from '@/lib/utils';
import { buildExplorerUrl, buildAccountExplorerUrl } from '@/lib/stellar';

interface PaymentTrackerProps {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  onConfirm: (paymentId: number) => void;
  onCancel: (paymentId: number) => void;
  onRefresh: () => void;
  onCreateClick: () => void;
  isConnected: boolean;
}

type SortField = 'id' | 'amount' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function PaymentTracker({
  payments,
  loading,
  error,
  onConfirm,
  onCancel,
  onRefresh,
  onCreateClick,
  isConnected,
}: PaymentTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'All'>('All');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter and sort payments
  const filteredPayments = payments
    .filter((p) => {
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        p.id.toString().includes(query) ||
        p.payee.toLowerCase().includes(query) ||
        p.metadata.toLowerCase().includes(query) ||
        p.asset.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      if (sortField === 'amount') return (Number(a.amount) - Number(b.amount)) * multiplier;
      if (sortField === 'created_at') return (a.created_at - b.created_at) * multiplier;
      if (sortField === 'status') return a.status.localeCompare(b.status) * multiplier;
      return (a.id - b.id) * multiplier;
    });

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return <PaymentListSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 text-center" role="alert">
        <p className="text-red-600 font-medium mb-2">Failed to load payments</p>
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium
                     hover:bg-red-100 transition-colors duration-150"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100
                         transition-colors duration-150"
              aria-label="Refresh payments"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onCreateClick}
              disabled={!isConnected}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors duration-150 shadow-sm"
            >
              + New Payment
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search by ID, address, or metadata..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg
                         text-sm text-gray-700 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {(['All', 'Pending', 'Confirmed', 'Cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150
                  ${statusFilter === status
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          title="No payments found"
          description={
            searchQuery || statusFilter !== 'All'
              ? 'Try adjusting your search or filters'
              : isConnected
              ? 'Create your first payment to get started'
              : 'Connect your wallet to view and create payments'
          }
          action={
            isConnected && !searchQuery && statusFilter === 'All'
              ? { label: 'Create Payment', onClick: onCreateClick }
              : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('id')}
                >
                  ID <SortIcon field="id" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payer / Payee
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('amount')}
                >
                  Amount <SortIcon field="amount" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon field="status" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metadata
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('created_at')}
                >
                  Date <SortIcon field="created_at" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className="hover:bg-gray-50/50 transition-colors duration-100"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-gray-900">#{payment.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleCopy(payment.payee)}
                        className="text-sm font-mono text-gray-600 hover:text-blue-600 text-left
                                   transition-colors duration-150 group"
                      >
                        {truncateAddress(payment.payee)}
                        <span className="ml-1 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {copiedId === payment.payee ? 'Copied!' : 'Copy'}
                        </span>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">
                      {formatAmount(payment.amount, payment.asset)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payment.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500 max-w-[150px] truncate block">
                      {payment.metadata || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500" title={new Date(payment.created_at * 1000).toLocaleString()}>
                      {formatRelativeTime(payment.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {payment.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => onConfirm(payment.id)}
                            className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50
                                       rounded-lg hover:bg-emerald-100 transition-colors duration-150"
                            title="Confirm payment"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => onCancel(payment.id)}
                            className="px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50
                                       rounded-lg hover:bg-red-100 transition-colors duration-150"
                            title="Cancel payment"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {payment.status === 'Confirmed' && (
                        <span className="text-xs text-emerald-600 font-medium">Completed</span>
                      )}
                      {payment.status === 'Cancelled' && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Showing {filteredPayments.length} of {payments.length} payments
        </p>
        <a
          href="https://stellar.expert/explorer/testnet"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
        >
          View on Stellar Explorer →
        </a>
      </div>
    </div>
  );
}
