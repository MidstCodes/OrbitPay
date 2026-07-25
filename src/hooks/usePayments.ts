/**
 * usePayments hook - Payment operations and state management.
 * Provides a clean interface for creating, confirming, and viewing payments.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Payment, CreatePaymentRequest, TransactionState, ToastMessage } from '@/types';
import {
  initiatePayment,
  initiateConfirmPayment,
  initiateCancelPayment,
  fetchPayments,
  getAllTransactions,
} from '@/services/payments';
import { useToast } from '@/providers/AppProvider';
import { generateId } from '@/lib/utils';

interface PaymentState {
  payments: Payment[];
  total: number;
  loading: boolean;
  error: string | null;
  isCreating: boolean;
  transactionState: TransactionState;
  transactions: ReturnType<typeof getAllTransactions>;
  refresh: () => Promise<void>;
  createPayment: (request: CreatePaymentRequest) => Promise<string | null>;
  confirmPayment: (paymentId: number) => Promise<string | null>;
  cancelPayment: (paymentId: number) => Promise<string | null>;
  applyFilters: (filters: { status?: string; search?: string; asset?: string }) => void;
}

/**
 * Manages payment state and operations.
 * @param address - Wallet address to query payments for
 * @param role - Whether to query as payer or payee
 */
export function usePayments(
  address: string | null,
  role: 'payer' | 'payee' = 'payer',
): PaymentState {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [transactionState, setTransactionState] = useState<TransactionState>('idle');
  const [filters, setFilters] = useState<{ status?: string; search?: string; asset?: string }>({});
  const { addToast } = useToast();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadPayments = useCallback(async () => {
    if (!address) {
      setPayments([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchPayments(address, role, 0, 20, filters);
      if (mountedRef.current) {
        setPayments(result.payments);
        setTotal(result.total);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load payments');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [address, role, filters]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const createPayment = useCallback(
    async (request: CreatePaymentRequest): Promise<string | null> => {
      if (!address) {
        addToast({
          id: generateId(),
          type: 'error',
          title: 'Wallet Required',
          message: 'Please connect your wallet first',
        });
        return null;
      }

      setIsCreating(true);
      setTransactionState('preparing');

      try {
        const txId = await initiatePayment(request, (state) => {
          if (mountedRef.current) {
            setTransactionState(state);
          }
        });

        if (mountedRef.current) {
          addToast({
            id: generateId(),
            type: 'success',
            title: 'Payment Created',
            message: `Payment has been created successfully`,
          });
          await loadPayments();
        }

        return txId;
      } catch (err) {
        if (mountedRef.current) {
          addToast({
            id: generateId(),
            type: 'error',
            title: 'Payment Failed',
            message: err instanceof Error ? err.message : 'Failed to create payment',
          });
        }
        return null;
      } finally {
        if (mountedRef.current) {
          setIsCreating(false);
          setTransactionState('idle');
        }
      }
    },
    [address, loadPayments, addToast],
  );

  const confirmPayment = useCallback(
    async (paymentId: number): Promise<string | null> => {
      setTransactionState('preparing');

      try {
        const txId = await initiateConfirmPayment(paymentId, (state) => {
          if (mountedRef.current) setTransactionState(state);
        });

        if (mountedRef.current) {
          addToast({
            id: generateId(),
            type: 'success',
            title: 'Payment Confirmed',
            message: `Payment #${paymentId} has been confirmed`,
          });
          await loadPayments();
        }

        return txId;
      } catch (err) {
        if (mountedRef.current) {
          addToast({
            id: generateId(),
            type: 'error',
            title: 'Confirmation Failed',
            message: err instanceof Error ? err.message : 'Failed to confirm payment',
          });
        }
        return null;
      } finally {
        if (mountedRef.current) setTransactionState('idle');
      }
    },
    [loadPayments, addToast],
  );

  const cancelPayment = useCallback(
    async (paymentId: number): Promise<string | null> => {
      setTransactionState('preparing');

      try {
        const txId = await initiateCancelPayment(paymentId, (state) => {
          if (mountedRef.current) setTransactionState(state);
        });

        if (mountedRef.current) {
          addToast({
            id: generateId(),
            type: 'info',
            title: 'Payment Cancelled',
            message: `Payment #${paymentId} has been cancelled`,
          });
          await loadPayments();
        }

        return txId;
      } catch (err) {
        if (mountedRef.current) {
          addToast({
            id: generateId(),
            type: 'error',
            title: 'Cancellation Failed',
            message: err instanceof Error ? err.message : 'Failed to cancel payment',
          });
        }
        return null;
      } finally {
        if (mountedRef.current) setTransactionState('idle');
      }
    },
    [loadPayments, addToast],
  );

  const refresh = useCallback(async () => {
    await loadPayments();
  }, [loadPayments]);

  return {
    payments,
    total,
    loading,
    error,
    isCreating,
    transactionState,
    transactions: getAllTransactions(),
    refresh,
    createPayment,
    confirmPayment,
    cancelPayment,
    applyFilters: setFilters,
  };
}
