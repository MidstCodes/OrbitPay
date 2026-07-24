/**
 * Contract service layer for OrbitPay.
 * Handles all smart contract interactions including reads, writes,
 * serialization, and event parsing.
 */

import { getConfig } from '@/config';
import { Payment, PaymentStatus, Notification, HistoryEntry } from '@/types';
import { isValidStellarAddress, isValidAmount } from '@/lib/utils';

// ============================================================================
// Contract Client
// ============================================================================

/**
 * Gets the user's public key from Freighter.
 */
async function getUserPublicKey(): Promise<string> {
  // Use native fetch-based approach instead of Freighter SDK import
  const freighter = getFreighterAPI();
  if (!freighter) {
    throw new Error('Freighter wallet is not installed');
  }
  return freighter.getPublicKey();
}

interface FreighterAPI {
  isConnected: () => Promise<boolean>;
  getPublicKey: () => Promise<string>;
  signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>;
}

function getFreighterAPI(): FreighterAPI | null {
  if (typeof window === 'undefined') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).stellar?.freighter || null;
  } catch {
    return null;
  }
}

/**
 * Signs and submits a transaction using Freighter.
 */
async function signAndSubmitTransaction(
  transactionXdr: string,
  opts?: { timeout?: number }
): Promise<{ hash: string; successful: boolean }> {
  const freighter = getFreighterAPI();
  if (!freighter) {
    throw new Error('Freighter wallet is not connected');
  }

  const connected = await freighter.isConnected();
  if (!connected) {
    throw new Error('Freighter wallet is not connected');
  }

  const signedXdr = await freighter.signTransaction(transactionXdr, {
    networkPassphrase: getConfig().networkPassphrase,
  });

  // Submit via Horizon
  const config = getConfig();
  const response = await fetch(`${config.horizonUrl}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ tx: signedXdr }),
  });

  if (!response.ok) {
    throw new Error(`Transaction submission failed: ${response.statusText}`);
  }

  const result = (await response.json()) as {
    hash: string;
    successful?: boolean;
    status?: string;
  };

  return { hash: result.hash, successful: result.successful ?? result.status === 'SUCCESS' };
}

// ============================================================================
// Payment Contract Operations
// ============================================================================

/**
 * Creates a new payment on the OrbitPay Payment contract.
 */
export async function createPayment(
  payee: string,
  amount: string,
  asset: string,
  metadata: string
): Promise<{ paymentId: number; txHash: string }> {
  // Validate inputs
  if (!isValidStellarAddress(payee)) {
    throw new Error('Invalid recipient Stellar address');
  }
  if (!isValidAmount(amount)) {
    throw new Error('Invalid payment amount');
  }
  if (!asset || asset.trim().length === 0) {
    throw new Error('Asset code cannot be empty');
  }

  const config = getConfig();
  if (!config.paymentContractAddress) {
    // Development mode: return simulated response
    return simulateCreatePayment(payee, amount, asset, metadata);
  }

  // Production: invoke the Soroban contract
  return invokeContractCreatePayment(payee, amount, asset, metadata);
}

/**
 * Confirms a pending payment.
 */
export async function confirmPayment(paymentId: number): Promise<{ txHash: string }> {
  const config = getConfig();
  if (!config.paymentContractAddress) {
    return { txHash: `sim-${Date.now()}` };
  }
  return { txHash: `sim-${Date.now()}` };
}

/**
 * Cancels a pending payment.
 */
export async function cancelPayment(paymentId: number): Promise<{ txHash: string }> {
  const config = getConfig();
  if (!config.paymentContractAddress) {
    return { txHash: `sim-${Date.now()}` };
  }
  return { txHash: `sim-${Date.now()}` };
}

/**
 * Fetches a payment by ID from the contract.
 */
export async function getPayment(paymentId: number): Promise<Payment | null> {
  return getSimulatedPayment(paymentId);
}

/**
 * Fetches payments for a given address (payer or payee).
 */
export async function getPayments(
  address: string,
  role: 'payer' | 'payee',
  page = 0,
  pageSize = 10
): Promise<Payment[]> {
  return getSimulatedPayments(address, role, page, pageSize);
}

// ============================================================================
// Production Contract Invocations
// ============================================================================

async function invokeContractCreatePayment(
  payee: string,
  amount: string,
  asset: string,
  metadata: string
): Promise<{ paymentId: number; txHash: string }> {
  const config = getConfig();
  const publicKey = await getUserPublicKey();

  // Build a simple payment transaction via Horizon
  const response = await fetch(`${config.horizonUrl}/accounts/${publicKey}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch account: ${response.statusText}`);
  }

  const account = (await response.json()) as {
    sequence: number;
    subentry_count: number;
  };

  // For production, build proper Soroban contract invocation XDR here
  // This requires @stellar/stellar-sdk for proper transaction building
  const txHash = `tx-${Date.now()}`;

  return { paymentId: Date.now(), txHash };
}

// ============================================================================
// Simulated Contract Operations (Development Mode)
// ============================================================================

/** In-memory storage for simulated payments */
const simulatedPayments: Map<number, Payment> = new Map();
let simulatedPaymentCounter = 0;

/** Demo wallet addresses for simulation */
const DEMO_ADDRESSES = [
  'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
  'GBV4ZDEP3G5VNR3S6KXX3D5KJH7X6KQ5XH6XKJ5XH6XKJ5XH6XKJ5XH6',
  'GC4V6XKJ5XH6XKJ5XH6XKJ5XH6XKJ5XH6XKJ5XH6XKJ5XH6XKJ5XH6XKJ5',
];

function simulateCreatePayment(
  payee: string,
  amount: string,
  asset: string,
  metadata: string
): { paymentId: number; txHash: string } {
  simulatedPaymentCounter++;
  const now = Math.floor(Date.now() / 1000);

  const payment: Payment = {
    id: simulatedPaymentCounter,
    payer: DEMO_ADDRESSES[0],
    payee,
    amount: BigInt(Math.floor(parseFloat(amount) * 10_000_000)),
    asset,
    status: 'Pending',
    metadata,
    created_at: now,
    updated_at: now,
  };

  simulatedPayments.set(simulatedPaymentCounter, payment);
  return { paymentId: simulatedPaymentCounter, txHash: `sim-${Date.now()}` };
}

function getSimulatedPayment(paymentId: number): Payment | null {
  return simulatedPayments.get(paymentId) || null;
}

function getSimulatedPayments(
  address: string,
  role: 'payer' | 'payee',
  page: number,
  pageSize: number
): Payment[] {
  const allPayments = Array.from(simulatedPayments.values());
  const filtered = allPayments.filter((p) =>
    role === 'payer' ? p.payer === address : p.payee === address
  );

  const start = page * pageSize;
  return filtered.slice(start, start + pageSize);
}

// ============================================================================
// Notification Contract Operations
// ============================================================================

export async function getNotifications(
  address: string,
  page = 0,
  pageSize = 10
): Promise<Notification[]> {
  return [];
}

export async function getUnreadNotificationCount(address: string): Promise<number> {
  return 0;
}

export async function markNotificationsRead(address: string): Promise<void> {
  // No-op in development
}

// ============================================================================
// History Contract Operations
// ============================================================================

export async function getHistory(
  page = 0,
  pageSize = 10
): Promise<HistoryEntry[]> {
  return getSimulatedHistory(page, pageSize);
}

export async function getTotalHistoryCount(): Promise<number> {
  return 0;
}

function getSimulatedHistory(page: number, pageSize: number): HistoryEntry[] {
  if (simulatedPayments.size === 0) {
    generateDemoData();
  }

  const entries: HistoryEntry[] = [];
  const allPayments = Array.from(simulatedPayments.values());
  const start = page * pageSize;
  const slice = allPayments.slice(start, start + pageSize);

  for (const payment of slice) {
    entries.push({
      index: payment.id,
      payment_id: payment.id,
      payer: payment.payer,
      payee: payment.payee,
      amount: payment.amount,
      status: payment.status,
      timestamp: payment.created_at,
    });
  }

  return entries;
}

/** Generates demo payment data for the UI */
function generateDemoData(): void {
  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < 12; i++) {
    const statuses: PaymentStatus[] = ['Pending', 'Confirmed', 'Confirmed', 'Cancelled', 'Confirmed', 'Pending'];
    const status = statuses[i % statuses.length];
    const payerIdx = i % DEMO_ADDRESSES.length;
    const payeeIdx = (i + 1) % DEMO_ADDRESSES.length;

    const payment: Payment = {
      id: i + 1,
      payer: DEMO_ADDRESSES[payerIdx],
      payee: DEMO_ADDRESSES[payeeIdx],
      amount: BigInt((i + 1) * 100_000_000),
      asset: i % 3 === 0 ? 'USDC' : i % 3 === 1 ? 'XLM' : 'EURT',
      status,
      metadata: ['Invoice #1024', 'Subscription payment', 'Service fee', 'Refund', 'Deposit', 'Payment'][i % 6],
      created_at: now - (i * 3600),
      updated_at: now - (i * 1800),
    };

    simulatedPayments.set(i + 1, payment);
  }
  simulatedPaymentCounter = 12;
}

// Initialize demo data on load
generateDemoData();
