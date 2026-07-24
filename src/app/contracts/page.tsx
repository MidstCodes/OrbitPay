'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { getConfig } from '@/config';
import { buildAccountExplorerUrl } from '@/lib/stellar';

export default function ContractsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const config = getConfig();

  const contracts = [
    {
      name: 'OrbitPay Payment',
      description: 'Manages payment creation, confirmation, and cancellation lifecycle',
      address: config.paymentContractAddress || 'Not deployed',
      deployed: !!config.paymentContractAddress,
    },
    {
      name: 'OrbitPay Notification',
      description: 'Handles user notifications via inter-contract communication',
      address: config.notificationContractAddress || 'Not deployed',
      deployed: !!config.notificationContractAddress,
    },
    {
      name: 'OrbitPay History',
      description: 'Maintains aggregate history of all payment events',
      address: config.historyContractAddress || 'Not deployed',
      deployed: !!config.historyContractAddress,
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 lg:px-6 py-6 space-y-6 max-w-7xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Smart Contracts</h1>
              <p className="text-sm text-gray-500 mt-1">Deployed contract addresses and status</p>
            </div>

            <div className="grid gap-4">
              {contracts.map((contract) => (
                <div key={contract.name} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{contract.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{contract.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      contract.deployed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}>
                      {contract.deployed ? 'Deployed' : 'Not Deployed'}
                    </span>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Contract Address</p>
                    <p className="text-sm font-mono text-gray-700 break-all">{contract.address}</p>
                  </div>
                  {contract.deployed && (
                    <a
                      href={buildAccountExplorerUrl(contract.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      View on Explorer ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
