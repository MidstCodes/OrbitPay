'use client';

/**
 * WalletProvider - Global wallet context for the OrbitPay application.
 * Provides wallet connection state to all child components.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { WalletInfo } from '@/types';

interface WalletContextValue {
  wallet: WalletInfo | null;
  isConnecting: boolean;
  error: string | null;
  isInstalled: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * Hook to access wallet context from any component.
 * Must be used within a WalletProvider.
 */
export function useWalletContext(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const walletState = useWallet();

  return <WalletContext.Provider value={walletState}>{children}</WalletContext.Provider>;
}
