'use client';

/**
 * App providers wrapper.
 * Composes all context providers required by the application.
 */

import React, { ReactNode } from 'react';
import { WalletProvider } from '@/providers/WalletProvider';
import { AppProvider } from '@/providers/AppProvider';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <AppProvider>
        <WalletProvider>{children}</WalletProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
