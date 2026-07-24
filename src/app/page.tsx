'use client';

/**
 * OrbitPay Dashboard Page.
 * Main landing page with analytics, payment tracking, activity feed,
 * transaction timeline, and payment creation modal.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useWalletContext } from '@/providers/WalletProvider';
import { usePayments } from '@/hooks/usePayments';
import { useEvents } from '@/hooks/useEvents';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { AnalyticsCards } from '@/components/dashboard/AnalyticsCards';
import { PaymentTracker } from '@/components/dashboard/PaymentTracker';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { TransactionTimeline } from '@/components/dashboard/TransactionTimeline';
import { Modal } from '@/components/ui/Modal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CreatePaymentForm } from '@/components/dashboard/CreatePaymentForm';
import { DashboardMetrics } from '@/types';

export default function DashboardPage() {
  const { wallet, isConnecting, connect, isInstalled } = useWalletContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    payments,
    loading: paymentsLoading,
    error: paymentsError,
    isCreating,
    transactionState,
    transactions,
    refresh: refreshPayments,
    createPayment,
    confirmPayment,
    cancelPayment,
  } = usePayments(wallet?.address || null, 'payee');

  const { activities, clearEvents, isPolling } = useEvents();

  // Compute dashboard metrics from payments
  const metrics = useMemo<DashboardMetrics>(() => {
    const pending = payments.filter((p) => p.status === 'Pending').length;
    const confirmed = payments.filter((p) => p.status === 'Confirmed').length;
    const cancelled = payments.filter((p) => p.status === 'Cancelled').length;
    const totalVolume = payments.reduce(
      (sum, p) => sum + (p.status !== 'Cancelled' ? p.amount : BigInt(0)),
      BigInt(0)
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

  const handleCreatePayment = useCallback(
    async (data: { payee: string; amount: string; asset: string; metadata: string }) => {
      const txId = await createPayment({
        payee: data.payee,
        amount: data.amount,
        asset: data.asset,
        metadata: data.metadata,
      });
      if (txId) {
        setShowCreateModal(false);
      }
    },
    [createPayment]
  );

  const handleConfirm = useCallback(
    async (paymentId: number) => {
      await confirmPayment(paymentId);
    },
    [confirmPayment]
  );

  const handleCancel = useCallback(
    async (paymentId: number) => {
      await cancelPayment(paymentId);
    },
    [cancelPayment]
  );

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
            {/* Welcome section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Monitor your payment flows on the Stellar network
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isPolling && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
                <button
                  onClick={refreshPayments}
                  className="btn-secondary flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {/* Wallet not connected banner */}
            {!wallet && !isConnecting && (
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Connect Your Wallet</h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Connect your Freighter wallet to start tracking payments on Stellar
                    </p>
                  </div>
                  <button
                    onClick={connect}
                    disabled={!isInstalled}
                    className="px-6 py-2.5 bg-white text-blue-700 rounded-lg font-medium
                               hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-150 shadow-lg"
                  >
                    {!isInstalled ? 'Install Freighter' : 'Connect Wallet'}
                  </button>
                </div>
              </div>
            )}

            {/* Analytics Cards */}
            <ErrorBoundary>
              <AnalyticsCards
                metrics={metrics}
                loading={paymentsLoading && payments.length === 0}
              />
            </ErrorBoundary>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Payment Tracker (takes 2/3) */}
              <div className="lg:col-span-2">
                <ErrorBoundary>
                  <PaymentTracker
                    payments={payments}
                    loading={paymentsLoading && payments.length === 0}
                    error={paymentsError}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    onRefresh={refreshPayments}
                    onCreateClick={() => setShowCreateModal(true)}
                    isConnected={!!wallet}
                  />
                </ErrorBoundary>
              </div>

              {/* Right sidebar: Activity + Transactions */}
              <div className="space-y-6">
                <ErrorBoundary>
                  <ActivityFeed
                    activities={activities}
                    loading={paymentsLoading && activities.length === 0}
                    onClear={clearEvents}
                  />
                </ErrorBoundary>

                <ErrorBoundary>
                  <TransactionTimeline
                    transactions={transactions}
                    loading={paymentsLoading}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Create Payment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Payment"
        size="lg"
      >
        <CreatePaymentForm
          onSubmit={handleCreatePayment}
          onCancel={() => setShowCreateModal(false)}
          isCreating={isCreating}
          transactionState={transactionState}
        />
      </Modal>
    </div>
  );
}
