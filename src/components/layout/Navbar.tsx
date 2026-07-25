'use client';

/**
 * Navigation bar component for OrbitPay.
 * Displays the app logo, global actions, and wallet connection status.
 */

import React, { useState } from 'react';
import { useWalletContext } from '@/providers/WalletProvider';
import { truncateAddress } from '@/lib/utils';
import { APP_NAME } from '@/constants';

interface NavbarProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
}

export function Navbar({ onMenuToggle, isSidebarOpen }: NavbarProps) {
  const { wallet, isConnecting, connect, disconnect, isInstalled } = useWalletContext();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left: Menu toggle + Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isSidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
              <span className="text-sm font-bold text-white">O</span>
            </div>
            <span className="hidden text-lg font-bold text-gray-900 sm:block">{APP_NAME}</span>
          </div>
        </div>

        {/* Center: Search (desktop) */}
        <div className="mx-4 hidden max-w-md flex-1 md:flex">
          <div className="relative w-full">
            <svg
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              placeholder="Search payments..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-4 pl-10 text-sm text-gray-700 placeholder-gray-400 transition-all duration-150 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Right: Actions + Wallet */}
        <div className="flex items-center gap-3">
          {/* Network indicator */}
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Testnet
          </span>

          {/* Wallet */}
          {wallet ? (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 transition-all duration-150 hover:border-gray-300 hover:bg-gray-50"
                aria-haspopup="true"
                aria-expanded={showDropdown}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
                  <span className="text-xs font-bold text-white">W</span>
                </div>
                <span className="hidden text-sm font-medium text-gray-700 sm:block">
                  {truncateAddress(wallet.address)}
                </span>
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown */}
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                    <div className="border-b border-gray-100 px-4 py-2">
                      <p className="text-xs text-gray-500">Connected Wallet</p>
                      <p className="mt-0.5 font-mono text-sm break-all text-gray-900">
                        {wallet.address}
                      </p>
                    </div>
                    <div className="px-4 py-2">
                      <p className="text-xs text-gray-500">Network</p>
                      <p className="text-sm font-medium text-gray-700 capitalize">
                        {wallet.network}
                      </p>
                    </div>
                    <div className="mt-1 border-t border-gray-100 pt-1">
                      <button
                        onClick={() => {
                          disconnect();
                          setShowDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 transition-colors duration-150 hover:bg-red-50"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting || !isInstalled}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:from-blue-700 hover:to-purple-700 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConnecting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Connecting...
                </span>
              ) : !isInstalled ? (
                'Install Freighter'
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Connect Wallet
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
