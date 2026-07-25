/**
 * useWallet hook - Stellar wallet connection and state management.
 * Handles Freighter wallet connection, disconnection, and network detection.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { WalletInfo } from '@/types';
import { connectWallet, isFreighterInstalled } from '@/lib/stellar';
import { ERROR_MESSAGES } from '@/constants';

interface WalletState {
  wallet: WalletInfo | null;
  isConnecting: boolean;
  error: string | null;
  isInstalled: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

/**
 * Tracks wallet connection state and provides connect/disconnect actions.
 * @returns Wallet state and control functions
 */
export function useWallet(): WalletState {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInstalled] = useState(() => isFreighterInstalled());

  const connect = useCallback(async () => {
    if (isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      if (!isFreighterInstalled()) {
        throw new Error(ERROR_MESSAGES.WALLET_UNAVAILABLE);
      }

      const walletInfo = await connectWallet();
      setWallet(walletInfo);
    } catch (err) {
      const message = err instanceof Error ? err.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
      setError(message);
      setWallet(null);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  const disconnect = useCallback(() => {
    setWallet(null);
    setError(null);
  }, []);

  return {
    wallet,
    isConnecting,
    error,
    isInstalled,
    connect,
    disconnect,
  };
}
