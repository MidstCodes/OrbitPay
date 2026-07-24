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
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 lg:px-6 py-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
                <p className="text-sm text-gray-500 mt-1">Real-time payment events and notifications</p>
              </div>
              {isPolling && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
