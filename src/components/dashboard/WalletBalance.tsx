'use client';

/**
 * Wallet balance component for OrbitPay.
 * Displays Stellar account balances fetched from Horizon.
 * Shows XLM, USDC, and other supported assets with loading states.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWalletContext } from '@/providers/WalletProvider';
import { fetchAccountBalances } from '@/services/contracts';
import { truncateAddress, formatTimestamp } from '@/lib/utils';

interface AssetBalance {
  asset: string;
  balance: string;
}

export function WalletBalance() {
  const { wallet, isConnecting, connect, isInstalled, disconnect } = useWalletContext();
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const loadBalances = useCallback(async () => {
    if (!wallet?.address) return;

    setLoading(true);
    try {
      const result = await fetchAccountBalances(wallet.address);
      setBalances(result);
    } catch {
      // Balances are optional — silently fail
    } finally {
      setLoading(false);
    }
  }, [wallet?.address]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const handleCopyAddress = async () => {
    if (!wallet?.address) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  };

  // Display only supported assets (XLM, USDC, EURT) sorted by balance
  const displayBalances = balances
    .filter((b) => ['XLM', 'USDC', 'EURT', 'native'].includes(b.asset))
    .map((b) => ({
      ...b,
      asset: b.asset === 'native' ? 'XLM' : b.asset,
    }))
    .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
    .slice(0, 5);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
              <span className="text-xs font-bold text-white">W</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Wallet</h3>
              <p className="text-xs text-gray-400">
                {wallet ? truncateAddress(wallet.address) : 'Not connected'}
              </p>
            </div>
          </div>
          <button
            onClick={loadBalances}
            disabled={loading || !wallet}
            className="rounded-lg p-1.5 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="Refresh balances"
          >
            <svg
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {!wallet ? (
        <div className="p-4 text-center">
          <p className="mb-3 text-sm text-gray-500">
            Connect your Freighter wallet to view balances
          </p>
          <button
            onClick={connect}
            disabled={!isInstalled}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!isInstalled ? 'Install Freighter' : 'Connect Wallet'}
          </button>
        </div>
      ) : loading && displayBalances.length === 0 ? (
        <div className="space-y-3 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex animate-pulse items-center justify-between">
              <div className="h-4 w-16 rounded bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {displayBalances.length === 0 ? (
            <p className="py-2 text-center text-sm text-gray-400">No balances found</p>
          ) : (
            displayBalances.map((balance) => (
              <div key={balance.asset} className="flex items-center justify-between py-1.5">
                <span className="text-sm font-medium text-gray-700">{balance.asset}</span>
                <span className="font-mono text-sm text-gray-900">
                  {parseFloat(balance.balance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 7,
                  })}
                </span>
              </div>
            ))
          )}

          {/* Divider */}
          <div className="mt-1 border-t border-gray-100 pt-3" />

          {/* Address actions */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Address</span>
            <button
              onClick={handleCopyAddress}
              className="font-mono text-xs text-blue-600 transition-colors duration-150 hover:text-blue-700"
            >
              {copiedAddress ? 'Copied!' : truncateAddress(wallet.address, 6)}
            </button>
          </div>

          {/* Network */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Network</span>
            <span className="text-xs font-medium text-emerald-600 capitalize">
              {wallet.network}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
