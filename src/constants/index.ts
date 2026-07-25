/**
 * Application constants for OrbitPay.
 * Centralized configuration values used across the frontend.
 */

import { NetworkConfig } from '@/types';

// ============================================================================
// Network Configuration
// ============================================================================

/** Stellar network configurations */
export const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    name: 'Testnet',
    networkPassphrase: 'Test SDF Network ; September 2015',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    isTestnet: true,
  },
  mainnet: {
    name: 'Public Network',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    horizonUrl: 'https://horizon.stellar.org',
    rpcUrl: 'https://soroban.stellar.org',
    isTestnet: false,
  },
};

/** Default network to use */
export const DEFAULT_NETWORK = NETWORKS.testnet;

// ============================================================================
// Contract Configuration
// ============================================================================

/**
 * Deployed contract addresses.
 * These are populated after contract deployment.
 * In development, use testnet addresses.
 * In production, update with mainnet addresses from deployment.
 */
export const CONTRACT_ADDRESSES = {
  payment: process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS || '',
  notification: process.env.NEXT_PUBLIC_NOTIFICATION_CONTRACT_ADDRESS || '',
  history: process.env.NEXT_PUBLIC_HISTORY_CONTRACT_ADDRESS || '',
} as const;

// ============================================================================
// Pagination
// ============================================================================

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

// ============================================================================
// Transaction States
// ============================================================================

export const TRANSACTION_TIMEOUT_MS = 120_000; // 2 minutes
export const POLL_INTERVAL_MS = 5_000; // 5 seconds for event polling
export const EXPLORER_URL = 'https://stellar.expert/explorer/testnet/tx/';
export const ACCOUNT_EXPLORER_URL = 'https://stellar.expert/explorer/testnet/account/';

// ============================================================================
// UI Constants
// ============================================================================

export const APP_NAME = 'OrbitPay';
export const APP_TAGLINE = 'Decentralized Payment Tracking on Stellar';
export const APP_DESCRIPTION =
  'Monitor payment flows, interact with smart contracts, and manage transaction lifecycles on the Stellar network.';

// ============================================================================
// Asset Configuration
// ============================================================================

export const SUPPORTED_ASSETS = ['XLM', 'USDC', 'EURT'] as const;
export type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  WALLET_UNAVAILABLE:
    'Freighter wallet is not installed. Please install Freighter to use OrbitPay.',
  WALLET_REJECTED: 'Wallet connection was rejected. Please try again.',
  INSUFFICIENT_BALANCE: 'Insufficient balance to complete this transaction.',
  NETWORK_FAILURE: 'Network connection failed. Please check your internet connection.',
  CONTRACT_FAILURE: 'Smart contract interaction failed. Please try again.',
  INVALID_ADDRESS: 'Invalid Stellar address provided.',
  INVALID_AMOUNT: 'Invalid payment amount. Amount must be positive.',
  TRANSACTION_TIMEOUT: 'Transaction timed out. Please try again.',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
} as const;
