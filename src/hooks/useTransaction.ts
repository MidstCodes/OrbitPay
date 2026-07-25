/**
 * useTransaction hook - Transaction lifecycle tracking.
 * Provides real-time state updates during transaction processing.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { TransactionLifecycle, TransactionState } from '@/types';
import { getTransaction, onTransactionUpdate, getAllTransactions } from '@/services/payments';

interface TransactionStateHook {
  currentTx: TransactionLifecycle | null;
  state: TransactionState;
  txId: string | null;
  allTransactions: TransactionLifecycle[];
  setTxId: (id: string | null) => void;
  clear: () => void;
}

/**
 * Tracks a specific transaction's lifecycle in real-time.
 *
 * @param transactionId - Optional transaction ID to track
 * @returns Transaction state with real-time updates
 */
export function useTransaction(transactionId?: string): TransactionStateHook {
  const [currentTx, setCurrentTx] = useState<TransactionLifecycle | null>(null);
  const [state, setState] = useState<TransactionState>('idle');
  const [txId, setTxId] = useState<string | null>(transactionId || null);
  const [allTransactions, setAllTransactions] = useState<TransactionLifecycle[]>([]);

  useEffect(() => {
    if (!txId) {
      return;
    }

    // Get initial state - defer to avoid cascading renders
    const tx = getTransaction(txId);
    if (tx) {
      const t = setTimeout(() => {
        setCurrentTx(tx);
        setState(tx.state);
      }, 0);
      return () => clearTimeout(t);
    }

    // Subscribe to updates
    const unsubscribe = onTransactionUpdate(txId, (updated) => {
      setCurrentTx(updated);
      setState(updated.state);
    });

    return unsubscribe;
  }, [txId]);

  // Refresh all transactions list periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setAllTransactions(getAllTransactions());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const clear = useCallback(() => {
    setCurrentTx(null);
    setState('idle');
    setTxId(null);
  }, []);

  return {
    currentTx,
    state,
    txId,
    allTransactions,
    setTxId,
    clear,
  };
}
