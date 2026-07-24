'use client';

import React, { useState, useMemo } from 'react';
import { useWalletContext } from '@/providers/WalletProvider';
import { usePayments } from '@/hooks/usePayments';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { PaymentCharts } from '@/components/dashboard/PaymentCharts';
import { AnalyticsCards } from '@/components/dashboard/AnalyticsCards';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DashboardMetrics } from '@/types';

export default function AnalyticsPage() {
  const { wallet } = useWalletContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { payments, loading, refresh: refreshPayments } = usePayments(
    wallet?.address || null,
    'payee',
  );

  const metrics = useMemo<DashboardMetrics>(() => {
    const pending = payments.filter((p) => p.status === 'Pending').length;
    const confirmed = payments.filter((p) => p.status === 'Confirmed').length;
    const cancelled = payments.filter((p) => p.status === 'Cancelled').length;
    const totalVolume = payments.reduce(
      (sum, p) => sum + (p.status !== 'Cancelled' ? p.amount : BigInt(0)),
      BigInt(0),
    );
    const uniqueAddresses = new Set([
      ...payments.map((p) => p.payer),
      ...payments.map((p) => p.payee),
    ]);

    return {
      totalPayments: payments.length,
      pendingPayments: pending,
      confirmedPayments: confirmed,
      cancelledPayments: cancelled,
      totalVolume,
      activeWallets: uniqueAddresses.size,
    };
  }, [payments]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 lg:px-6 py-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Payment volume trends, status distribution, and asset breakdown
                </p>
              </div>
              <button onClick={refreshPayments} className="btn-secondary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>

            <ErrorBoundary>
              <AnalyticsCards metrics={metrics} loading={loading && payments.length === 0} />
            </ErrorBoundary>

            <ErrorBoundary>
              <PaymentCharts payments={payments} loading={loading && payments.length === 0} />
            </ErrorBoundary>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
