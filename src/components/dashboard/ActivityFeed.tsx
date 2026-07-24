'use client';

/**
 * Activity feed component for OrbitPay.
 * Displays a real-time feed of payment events and blockchain interactions.
 */

import React, { useRef, useEffect } from 'react';
import { ActivityItem } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/lib/utils';

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
  onClear?: () => void;
}

const typeStyles: Record<string, { icon: string; color: string; bg: string }> = {
  payment_created: {
    icon: '+',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  payment_confirmed: {
    icon: '✓',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
  },
  payment_cancelled: {
    icon: '✕',
    color: 'text-red-600',
    bg: 'bg-red-100',
  },
};

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const style = typeStyles[item.type] || typeStyles.payment_created;

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-100">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${style.bg} flex items-center justify-center`}>
        <span className={`text-sm font-bold ${style.color}`}>{style.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700">{item.message}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{formatRelativeTime(item.timestamp)}</span>
          {item.explorerUrl && (
            <a
              href={item.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
            >
              View tx →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  );
}

export function ActivityFeed({ activities, loading = false, onClear }: ActivityFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    if (shouldAutoScroll.current && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [activities.length]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Activity Feed</h3>
          {!loading && activities.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-full">
              {activities.length}
            </span>
          )}
        </div>
        {onClear && activities.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto"
        role="log"
        aria-label="Activity feed"
        aria-live="polite"
      >
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))
        ) : activities.length === 0 ? (
          <EmptyState
            variant="compact"
            title="No activity yet"
            description="Payment events will appear here"
          />
        ) : (
          activities.map((item) => (
            <ActivityItemRow key={item.id} item={item} />
          ))
        )}
      </div>

      {/* Live indicator */}
      {!loading && activities.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      )}
    </div>
  );
}
