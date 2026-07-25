'use client';

import React, { useState } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function ActivityPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activities, clearEvents, isPolling } = useEvents();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Real-time payment events and notifications
                </p>
              </div>
              {isPolling && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </span>
              )}
            </div>
            <ErrorBoundary>
              <ActivityFeed activities={activities} onClear={clearEvents} />
            </ErrorBoundary>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
