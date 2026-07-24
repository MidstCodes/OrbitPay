/**
 * Payment service for OrbitPay.
 * High-level API for payment operations used by UI components.
 */

import {
  createPayment as contractCreatePayment,
  confirmPayment as contractConfirmPayment,
  cancelPayment as contractCancelPayment,
  getPayments as contractGetPayments,
} from './contracts';
import { Payment, CreatePaymentRequest, TransactionLifecycle, TransactionState } from '@/types';
import { generateId } from '@/lib/utils';

// ============================================================================
// Transaction Lifecycle Management
// ============================================================================

/** Active transactions being tracked */
const activeTransactions: Map<string, TransactionLifecycle> = new Map();

/** Callbacks for transaction state changes */
type TransactionCallback = (tx: TransactionLifecycle) => void;
const transactionListeners: Map<string, Set<TransactionCallback>> = new Map();

/**
 * Creates a new transaction lifecycle tracker.
 */
function createTransaction(paymentId: number | null = null): TransactionLifecycle {
  const tx: TransactionLifecycle = {
    id: generateId(),
    hash: null,
    state: 'idle',
    status: null,
    explorerUrl: null,
    error: null,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    paymentId,
  };
  activeTransactions.set(tx.id, tx);
  return tx;
}

/**
 * Updates a transaction's state and notifies listeners.
 */
function updateTransaction(
  txId: string,
  updates: Partial<TransactionLifecycle>,
): TransactionLifecycle {
  const tx = activeTransactions.get(txId);
  if (!tx) throw new Error(`Transaction ${txId} not found`);

  const updated = { ...tx, ...updates, updatedAt: Date.now() };
  activeTransactions.set(txId, updated);

  // Notify listeners
  const listeners = transactionListeners.get(txId);
  listeners?.forEach((cb) => cb(updated));

  return updated;
}

/**
 * Subscribes to transaction state changes.
 * Immediately invokes the callback with the current state if available.
 * Returns an unsubscribe function.
 */
export function onTransactionUpdate(txId: string, callback: TransactionCallback): () => void {
  if (!transactionListeners.has(txId)) {
    transactionListeners.set(txId, new Set());
  }
  transactionListeners.get(txId)!.add(callback);

  // Immediately notify with current state
  const currentTx = activeTransactions.get(txId);
  if (currentTx) {
    callback(currentTx);
  }

  return () => {
    transactionListeners.get(txId)?.delete(callback);
  };
}

/**
 * Gets the current state of a transaction.
 */
export function getTransaction(txId: string): TransactionLifecycle | undefined {
  return activeTransactions.get(txId);
}

/**
 * Gets all active transactions.
 */
export function getAllTransactions(): TransactionLifecycle[] {
  return Array.from(activeTransactions.values()).sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * Clears all tracked transactions (useful for testing).
 */
export function clearTransactions(): void {
  activeTransactions.clear();
  transactionListeners.clear();
}

// ============================================================================
// Payment Operations
// ============================================================================

/**
 * Creates a new payment with full transaction lifecycle tracking.
 *
 * @param request - Payment creation parameters
 * @param onStateChange - Optional callback for state updates
 * @returns Transaction tracking ID
 */
export async function initiatePayment(
  request: CreatePaymentRequest,
  onStateChange?: (state: TransactionState) => void,
): Promise<string> {
  const tx = createTransaction();
  const txId = tx.id;

  try {
    // Step 1: Preparing
    updateTransaction(txId, { state: 'preparing' });
    onStateChange?.('preparing');
    await new Promise((r) => setTimeout(r, 100));

    // Step 2: Submit to contract
    updateTransaction(txId, { state: 'submitting' });
    onStateChange?.('submitting');

    const result = await contractCreatePayment(
      request.payee,
      request.amount,
      request.asset,
      request.metadata,
    );

    // Step 3: Pending confirmation
    updateTransaction(txId, {
      state: 'pending',
      hash: result.txHash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.txHash}`,
      paymentId: result.paymentId,
    });
    onStateChange?.('pending');

    // Step 4: Confirmed
    updateTransaction(txId, {
      state: 'confirmed',
      status: 'Pending',
    });
    onStateChange?.('confirmed');

    return txId;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transaction failed';

    updateTransaction(txId, {
      state: 'failed',
      error: message,
    });
    onStateChange?.('failed');

    throw error;
  }
}

/**
 * Confirms a payment with transaction lifecycle tracking.
 */
export async function initiateConfirmPayment(
  paymentId: number,
  onStateChange?: (state: TransactionState) => void,
): Promise<string> {
  const tx = createTransaction(paymentId);
  const txId = tx.id;

  try {
    updateTransaction(txId, { state: 'preparing' });
    onStateChange?.('preparing');

    const result = await contractConfirmPayment(paymentId);

    updateTransaction(txId, {
      state: 'confirmed',
      hash: result.txHash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.txHash}`,
      status: 'Confirmed',
    });
    onStateChange?.('confirmed');

    return txId;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Confirmation failed';
    updateTransaction(txId, { state: 'failed', error: message });
    onStateChange?.('failed');
    throw error;
  }
}

/**
 * Cancels a payment with transaction lifecycle tracking.
 */
export async function initiateCancelPayment(
  paymentId: number,
  onStateChange?: (state: TransactionState) => void,
): Promise<string> {
  const tx = createTransaction(paymentId);
  const txId = tx.id;

  try {
    updateTransaction(txId, { state: 'preparing' });
    onStateChange?.('preparing');

    const result = await contractCancelPayment(paymentId);

    updateTransaction(txId, {
      state: 'confirmed',
      hash: result.txHash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.txHash}`,
      status: 'Cancelled',
    });
    onStateChange?.('confirmed');

    return txId;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cancellation failed';
    updateTransaction(txId, { state: 'failed', error: message });
    onStateChange?.('failed');
    throw error;
  }
}

/**
 * Fetches payments for an address with filtering support.
 */
export async function fetchPayments(
  address: string,
  role: 'payer' | 'payee' = 'payer',
  page = 0,
  pageSize = 10,
  filters?: { status?: string; search?: string; asset?: string },
): Promise<{ payments: Payment[]; total: number }> {
  let payments = await contractGetPayments(address, role, page, pageSize);

  // Apply filters
  if (filters?.status) {
    payments = payments.filter((p) => p.status === filters.status);
  }
  if (filters?.asset) {
    payments = payments.filter((p) => p.asset === filters.asset);
  }
  if (filters?.search) {
    const query = filters.search.toLowerCase();
    payments = payments.filter(
      (p) =>
        p.metadata.toLowerCase().includes(query) ||
        p.payee.toLowerCase().includes(query) ||
        p.payer.toLowerCase().includes(query),
    );
  }

  return { payments, total: payments.length };
}
