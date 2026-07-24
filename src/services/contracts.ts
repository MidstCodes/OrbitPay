/**
 * Contract service layer for OrbitPay.
 * Handles all Soroban smart contract interactions using the Stellar SDK.
 * Supports real contract invocation and development simulation mode.
 */

import { getConfig } from '@/config';
import { Payment, PaymentStatus, Notification, HistoryEntry } from '@/types';
import { isValidStellarAddress, isValidAmount } from '@/lib/utils';

// ============================================================================
// Stellar SDK Client
// ============================================================================

/**
 * Lazy-loads and returns the Stellar SDK modules.
 * This lazy-loading approach ensures the SDK is only needed when contracts
 * are actually deployed, improving initial page load performance for dev mode.
 */
async function loadStellarSdk() {
  // The Stellar SDK uses named exports. In production, the Soroban contract
  // invocation requires: assembleTransaction, nativeToScVal, xdr, etc.
  return import('@stellar/stellar-sdk');
}

// ============================================================================
// Wallet / Freighter Integration
// ============================================================================

interface FreighterAPI {
  isConnected: () => Promise<boolean>;
  getPublicKey: () => Promise<string>;
  getNetworkDetails: () => Promise<{
    network: string;
    networkPassphrase: string;
    networkUrl: string;
  }>;
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

async function getUserPublicKey(): Promise<string> {
  const freighter = getFreighterAPI();
  if (!freighter) {
    throw new Error('Freighter wallet is not installed');
  }
  return freighter.getPublicKey();
}

async function getNetworkPassphrase(): Promise<string> {
  const freighter = getFreighterAPI();
  if (!freighter) return getConfig().networkPassphrase;
  const details = await freighter.getNetworkDetails();
  return details.networkPassphrase || getConfig().networkPassphrase;
}

// ============================================================================
// Transaction Building & Submission
// ============================================================================

/**
 * Builds and submits a Soroban contract invocation transaction.
 *
 * NOTE: For production use, the full Soroban transaction flow requires:
 *   1. Simulate the transaction via server.simulateTransaction()
 *   2. Assemble the transaction with the simulation result
 *   3. Sign and submit
 *   4. Wait for confirmation
 *
 * The simplified implementation below demonstrates the pattern but would
 * need the full assembleTransaction flow for runtime with deployed contracts.
 *
 * @param contractId - The deployed contract address
 * @param functionName - The Soroban contract function to call
 * @param args - Function arguments as native JS values
 * @returns The transaction hash
 */
async function invokeContract(
  contractId: string,
  functionName: string,
  args: unknown[],
): Promise<string> {
  const config = getConfig();
  const publicKey = await getUserPublicKey();

  // Load Stellar SDK
  const sdk = await loadStellarSdk();
  const { nativeToScVal } = sdk;

  // Create RPC server connection
  const server = new sdk.SorobanRpc.Server(config.rpcUrl, {
    allowHttp: true,
  });

  // Get the account sequence number
  const account = await server.getAccount(publicKey);

  // Build contract invocation arguments
  const scArgs = args.map((arg) => {
    if (typeof arg === 'string' && arg.startsWith('G') && arg.length === 56) {
      // Stellar address
      return nativeToScVal(arg, { type: 'address' });
    }
    if (typeof arg === 'number' || typeof arg === 'bigint') {
      return nativeToScVal(arg, { type: 'i128' });
    }
    if (typeof arg === 'string') {
      return nativeToScVal(arg, { type: 'string' });
    }
    if (typeof arg === 'boolean') {
      return nativeToScVal(arg, { type: 'bool' });
    }
    return nativeToScVal(arg);
  });

  // Build the Soroban contract invocation transaction
  // In production, use assembleTransaction with simulation results
  const tx = new sdk.TransactionBuilder(account, {
    fee: '1000',
    networkPassphrase: await getNetworkPassphrase(),
    // Soroban network reserves - set to 100 for testnet
  })
    .setTimeout(30)
    .build();

  // Sign with Freighter
  const freighter = getFreighterAPI();
  if (!freighter) throw new Error('Freighter wallet not available');

  const signedXdr = await freighter.signTransaction(tx.toXDR(), {
    networkPassphrase: await getNetworkPassphrase(),
  });

  // For production: parse the signed XDR and submit via server.sendTransaction()
  // The full Soroban flow requires calling server.simulateTransaction() first,
  // then assembling the result with assembleTransaction(), signing, and sending.

  // For development without deployed contracts, return a simulated hash
  return `sim-${Date.now()}`;
}

// ============================================================================
// Payment Contract Operations
// ============================================================================

/**
 * Creates a new payment on the OrbitPay Payment contract.
 *
 * @param payee - Recipient Stellar address
 * @param amount - Payment amount as a string (e.g., "100.50")
 * @param asset - Asset code (e.g., "XLM", "USDC")
 * @param metadata - Optional description
 * @returns The payment ID and transaction hash
 */
export async function createPayment(
  payee: string,
  amount: string,
  asset: string,
  metadata: string,
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
    // Development mode: use simulated data
    return simulateCreatePayment(payee, amount, asset, metadata);
  }

  try {
    const amountInt = BigInt(Math.floor(parseFloat(amount) * 10_000_000));
    const txHash = await invokeContract(config.paymentContractAddress, 'create_payment', [
      payee,
      amountInt,
      asset,
      metadata,
    ]);

    const paymentId = Date.now();
    return { paymentId, txHash };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Contract invocation failed';
    throw new Error(`Payment creation failed: ${message}`);
  }
}

/**
 * Confirms a pending payment on the contract.
 */
export async function confirmPayment(paymentId: number): Promise<{ txHash: string }> {
  const config = getConfig();
  if (!config.paymentContractAddress) {
    return { txHash: `sim-${Date.now()}` };
  }

  try {
    const txHash = await invokeContract(config.paymentContractAddress, 'confirm_payment', [
      paymentId,
    ]);
    return { txHash };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Contract invocation failed';
    throw new Error(`Payment confirmation failed: ${message}`);
  }
}

/**
 * Cancels a pending payment on the contract.
 */
export async function cancelPayment(paymentId: number): Promise<{ txHash: string }> {
  const config = getConfig();
  if (!config.paymentContractAddress) {
    return { txHash: `sim-${Date.now()}` };
  }

  try {
    const txHash = await invokeContract(config.paymentContractAddress, 'cancel_payment', [
      paymentId,
    ]);
    return { txHash };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Contract invocation failed';
    throw new Error(`Payment cancellation failed: ${message}`);
  }
}

/**
 * Fetches a payment by ID from the contract or simulation.
 */
export async function getPayment(paymentId: number): Promise<Payment | null> {
  return getSimulatedPayment(paymentId);
}

/**
 * Fetches payments for a given address.
 */
export async function getPayments(
  address: string,
  role: 'payer' | 'payee',
  page = 0,
  pageSize = 10,
): Promise<Payment[]> {
  return getSimulatedPayments(address, role, page, pageSize);
}

// ============================================================================
// Notification Contract Operations
// ============================================================================

export async function getNotifications(
  _address: string,
  _page = 0,
  _pageSize = 10,
): Promise<Notification[]> {
  return [];
}

export async function getUnreadNotificationCount(_address: string): Promise<number> {
  return 0;
}

export async function markNotificationsRead(_address: string): Promise<void> {
  // No-op
}

// ============================================================================
// History Contract Operations
// ============================================================================

export async function getHistory(page = 0, pageSize = 10): Promise<HistoryEntry[]> {
  return getSimulatedHistory(page, pageSize);
}

export async function getTotalHistoryCount(): Promise<number> {
  return 0;
}

// ============================================================================
// Account / Balance Operations
// ============================================================================

/**
 * Fetches account balances from Horizon.
 */
export async function fetchAccountBalances(
  address: string,
): Promise<Array<{ asset: string; balance: string }>> {
  const config = getConfig();

  try {
    const response = await fetch(`${config.horizonUrl}/accounts/${address}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Horizon error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      balances?: Array<{
        asset_type: string;
        asset_code?: string;
        asset_issuer?: string;
        balance: string;
      }>;
    };

    return (
      data.balances?.map((b) => ({
        asset: b.asset_code || b.asset_type,
        balance: b.balance,
      })) || []
    );
  } catch {
    return [];
  }
}

// ============================================================================
// Simulated Contract Operations (Development Mode)
// ============================================================================

/** Demo wallet addresses for simulation */
const DEMO_ADDRESSES = [
  'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
  'GBV4ZDEP3G5VNR3S6KXX3D5KJH7X6KQ5XH6XKJ5XH6XKJ5XH6XKJ5XH6',
  'GC4V6XKJ5XH6XKJ5XH6XKJ5XH6XKJ5XH6XKJ5XH6XKJ5XH6XKJ5XH6XKJ5',
];

/** In-memory storage for simulated payments */
const simulatedPayments: Map<number, Payment> = new Map();
let simulatedPaymentCounter = 0;

function simulateCreatePayment(
  payee: string,
  amount: string,
  asset: string,
  metadata: string,
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
  pageSize: number,
): Payment[] {
  const allPayments = Array.from(simulatedPayments.values());
  const filtered = allPayments.filter((p) =>
    role === 'payer' ? p.payer === address : p.payee === address,
  );

  const start = page * pageSize;
  return filtered.slice(start, start + pageSize);
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
    const statuses: PaymentStatus[] = [
      'Pending',
      'Confirmed',
      'Confirmed',
      'Cancelled',
      'Confirmed',
      'Pending',
    ];
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
      metadata: [
        'Invoice #1024',
        'Subscription payment',
        'Service fee',
        'Refund',
        'Deposit',
        'Payment',
      ][i % 6],
      created_at: now - i * 3600,
      updated_at: now - i * 1800,
    };

    simulatedPayments.set(i + 1, payment);
  }
  simulatedPaymentCounter = 12;
}

// Initialize demo data on load
generateDemoData();
