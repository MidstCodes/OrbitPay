/**
 * Stellar network interaction library for OrbitPay.
 * Handles wallet connection, transaction building, and network queries.
 */

import { getConfig } from '@/config';
import { WalletInfo, NetworkConfig } from '@/types';
import { DEFAULT_NETWORK } from '@/constants';

// ============================================================================
// Type declarations for Freighter API
// ============================================================================

interface FreighterAPI {
  isConnected: () => Promise<boolean>;
  getPublicKey: () => Promise<string>;
  getNetworkDetails: () => Promise<{
    network: string;
    networkPassphrase: string;
    networkUrl: string;
  }>;
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; network?: string }
  ) => Promise<string>;
}

// ============================================================================
// Wallet Detection
// ============================================================================

/** Gets the Freighter API instance from the window object */
function getFreighter(): FreighterAPI | null {
  if (typeof window === 'undefined') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).stellar?.freighter || null;
  } catch {
    return null;
  }
}

/** Checks if Freighter wallet is installed */
export function isFreighterInstalled(): boolean {
  return getFreighter() !== null;
}

/** Gets the user's Stellar address from Freighter */
export async function getFreighterAddress(): Promise<string> {
  const freighter = getFreighter();
  if (!freighter) {
    throw new Error('Freighter wallet is not installed');
  }
  return freighter.getPublicKey();
}

/** Requests wallet connection and returns wallet info */
export async function connectWallet(): Promise<WalletInfo> {
  const freighter = getFreighter();
  if (!freighter) {
    throw new Error('Freighter wallet is not installed');
  }

  const connected = await freighter.isConnected();
  if (!connected) {
    throw new Error('Freighter wallet is not connected. Please unlock Freighter and try again.');
  }

  const publicKey = await freighter.getPublicKey();
  const networkDetails = await freighter.getNetworkDetails();

  return {
    address: publicKey,
    publicKey,
    network: networkDetails.network || 'testnet',
    networkPassphrase: networkDetails.networkPassphrase || DEFAULT_NETWORK.networkPassphrase,
    isConnected: true,
  };
}

/** Signs a transaction XDR using Freighter */
export async function signTransactionXDR(
  xdr: string,
  networkPassphrase?: string
): Promise<string> {
  const freighter = getFreighter();
  if (!freighter) {
    throw new Error('Freighter wallet is not installed');
  }

  return freighter.signTransaction(xdr, {
    networkPassphrase: networkPassphrase || DEFAULT_NETWORK.networkPassphrase,
  });
}

// ============================================================================
// Network Helpers
// ============================================================================

/** Gets the current Stellar network configuration */
export function getNetworkConfig(): NetworkConfig {
  return DEFAULT_NETWORK;
}

/** Builds a Stellar.expert explorer URL for a transaction */
export function buildExplorerUrl(txHash: string): string {
  const config = getConfig();
  const explorer = config.network === 'testnet'
    ? 'https://stellar.expert/explorer/testnet/tx'
    : 'https://stellar.expert/explorer/public/tx';
  return `${explorer}/${txHash}`;
}

/** Builds a Stellar.explorer URL for an account */
export function buildAccountExplorerUrl(address: string): string {
  const config = getConfig();
  const explorer = config.network === 'testnet'
    ? 'https://stellar.expert/explorer/testnet/account'
    : 'https://stellar.expert/explorer/public/account';
  return `${explorer}/${address}`;
}

// ============================================================================
// Horizon Queries
// ============================================================================

/** Fetches account details from Horizon */
export async function getAccountDetails(address: string): Promise<Record<string, unknown>> {
  const config = getConfig();
  const response = await fetch(`${config.horizonUrl}/accounts/${address}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch account details: ${response.statusText}`);
  }

  return response.json();
}

/** Fetches recent transactions for an account */
export async function getRecentTransactions(
  address: string,
  limit = 20
): Promise<Record<string, unknown>[]> {
  const config = getConfig();
  const url = `${config.horizonUrl}/accounts/${address}/transactions?limit=${limit}&order=desc`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`);
  }

  const data = (await response.json()) as { _embedded?: { records: Record<string, unknown>[] } };
  return data._embedded?.records || [];
}

/** Fetches account balance */
export async function getAccountBalance(address: string): Promise<Record<string, string>[]> {
  const account = await getAccountDetails(address);
  return (account as { balances?: Record<string, string>[] }).balances || [];
}
