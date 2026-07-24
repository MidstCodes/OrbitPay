'use client';

import React, { useState, useCallback } from 'react';
import { useWalletContext } from '@/providers/WalletProvider';
import { usePayments } from '@/hooks/usePayments';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { PaymentTracker } from '@/components/dashboard/PaymentTracker';
import { Modal } from '@/components/ui/Modal';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CreatePaymentForm } from '@/components/dashboard/CreatePaymentForm';

export default function PaymentsPage() {
  const { wallet } = useWalletContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    payments,
    loading,
    error,
    isCreating,
    transactionState,
    refresh,
    createPayment,
    confirmPayment,
    cancelPayment,
  } = usePayments(wallet?.address || null, 'payee');

  const handleCreatePayment = useCallback(
    async (data: { payee: string; amount: string; asset: string; metadata: string }) => {
      const txId = await createPayment(data);
      if (txId) setShowCreateModal(false);
    },
    [createPayment]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 lg:px-6 py-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                <p className="text-sm text-gray-500 mt-1">Manage and track all your payments</p>
              </div>
            </div>
            <ErrorBoundary>
              <PaymentTracker
                payments={payments}
                loading={loading && payments.length === 0}
                error={error}
                onConfirm={confirmPayment}
                onCancel={cancelPayment}
                onRefresh={refresh}
                onCreateClick={() => setShowCreateModal(true)}
                isConnected={!!wallet}
              />
            </ErrorBoundary>
          </div>
        </main>
        <Footer />
      </div>
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Payment" size="lg">
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
