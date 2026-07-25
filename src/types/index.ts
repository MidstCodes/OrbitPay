/**
 * Core type definitions for OrbitPay.
 * These types mirror the Soroban contract data structures
 * and provide type safety across the frontend.
 */

// ============================================================================
// Payment Types
// ============================================================================

/** Complete lifecycle status for a payment */
export type PaymentStatus = 'Pending' | 'Confirmed' | 'Cancelled';

/** Payment data structure matching the Soroban Payment contract */
export interface Payment {
  id: number;
  payer: string;
  payee: string;
  amount: bigint;
  asset: string;
  status: PaymentStatus;
  metadata: string;
  created_at: number;
  updated_at: number;
}

/** Payment creation request payload */
export interface CreatePaymentRequest {
  payee: string;
  amount: string;
  asset: string;
  metadata: string;
}

// ============================================================================
// Transaction Lifecycle Types
// ============================================================================

/** All possible states in a transaction's lifecycle */
export type TransactionState =
  | 'idle'
  | 'preparing'
  | 'awaiting_approval'
  | 'signing'
  | 'submitting'
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'rejected'
  | 'timed_out';

/** Full transaction lifecycle tracking object */
export interface TransactionLifecycle {
  id: string;
  hash: string | null;
  state: TransactionState;
  status: PaymentStatus | null;
  explorerUrl: string | null;
  error: string | null;
  startedAt: number;
  updatedAt: number;
  paymentId: number | null;
}

// ============================================================================
// Notification Types
// ============================================================================

/** Notification data structure matching the Soroban Notification contract */
export interface Notification {
  id: number;
  recipient: string;
  message: string;
  notification_type: string;
  read: boolean;
  created_at: number;
}

// ============================================================================
// History Types
// ============================================================================

/** History entry data structure matching the Soroban History contract */
export interface HistoryEntry {
  index: number;
  payment_id: number;
  payer: string;
  payee: string;
  amount: bigint;
  status: PaymentStatus;
  timestamp: number;
}

// ============================================================================
// Wallet Types
// ============================================================================

/** Connected wallet information */
export interface WalletInfo {
  address: string;
  publicKey: string;
  network: string;
  networkPassphrase: string;
  isConnected: boolean;
}

/** Network configuration */
export interface NetworkConfig {
  name: string;
  networkPassphrase: string;
  horizonUrl: string;
  rpcUrl: string;
  isTestnet: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

/** Real-time event from the Stellar network */
export interface PaymentEvent {
  type:
    | 'payment_created'
    | 'payment_confirmed'
    | 'payment_cancelled'
    | 'notification_sent'
    | 'history_updated';
  data: Record<string, unknown>;
  timestamp: number;
  txHash?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

/** Generic pagination state */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

/** Async operation state */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Toast notification for the UI */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

// ============================================================================
// Dashboard Types
// ============================================================================

/** Dashboard analytics summary */
export interface DashboardMetrics {
  totalPayments: number;
  pendingPayments: number;
  confirmedPayments: number;
  cancelledPayments: number;
  totalVolume: bigint;
  activeWallets: number;
}

/** Activity feed item */
export interface ActivityItem {
  id: string;
  type: 'payment_created' | 'payment_confirmed' | 'payment_cancelled';
  message: string;
  timestamp: number;
  paymentId: number;
  explorerUrl?: string;
}

// ============================================================================
// Contract Deployment Types
// ============================================================================

/** Deployed contract configuration */
export interface DeployedContract {
  id: string;
  address: string;
  network: string;
  deployedAt: string;
  txHash: string;
}
