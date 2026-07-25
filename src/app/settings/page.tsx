'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { getConfig } from '@/config';

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const config = getConfig();

  const settings = [
    { label: 'Network', value: config.network, description: 'Stellar network environment' },
    {
      label: 'Network Passphrase',
      value: config.networkPassphrase,
      description: 'Used for transaction signing',
    },
    { label: 'Horizon URL', value: config.horizonUrl, description: 'Stellar Horizon API endpoint' },
    { label: 'RPC URL', value: config.rpcUrl, description: 'Soroban RPC endpoint' },
    {
      label: 'Event Polling',
      value: config.enableEvents ? 'Enabled' : 'Disabled',
      description: 'Real-time event synchronization',
    },
    {
      label: 'Poll Interval',
      value: `${config.pollIntervalMs}ms`,
      description: 'Event polling frequency',
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-500">
                Application configuration and preferences
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Network Configuration</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {settings.map((setting) => (
                  <div key={setting.label} className="flex items-start justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{setting.label}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{setting.description}</p>
                    </div>
                    <span className="rounded bg-gray-50 px-2 py-1 font-mono text-sm text-gray-600">
                      {setting.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">About OrbitPay</h2>
              <p className="text-sm text-gray-500">
                Version 1.0.0 &mdash; Built on Stellar Soroban. A production-grade decentralized
                payment tracking platform enabling users to monitor payment flows, interact with
                smart contracts, and manage transaction lifecycles.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
