/**
 * useEvents hook - Real-time event subscription for payments.
 * Automatically manages event polling lifecycle and cleanup.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PaymentEvent, ActivityItem } from '@/types';
import {
  startEventPolling,
  stopEventPolling,
  subscribeToAllEvents,
  subscribeToEvents,
  paymentToActivity,
} from '@/services/events';
import { generateId } from '@/lib/utils';

interface EventState {
  events: PaymentEvent[];
  activities: ActivityItem[];
  isPolling: boolean;
  latestEvent: PaymentEvent | null;
}

/**
 * Subscribes to real-time payment events and manages the polling lifecycle.
 * Automatically starts polling on mount and cleans up on unmount.
 *
 * @returns Event state including latest events, activities, and polling status
 */
export function useEvents(): EventState & {
  clearEvents: () => void;
  addActivity: (item: ActivityItem) => void;
} {
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [latestEvent, setLatestEvent] = useState<PaymentEvent | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Start polling
    setIsPolling(true);
    const stop = startEventPolling();

    // Subscribe to all events
    const unsubscribe = subscribeToAllEvents((event) => {
      if (!mountedRef.current) return;

      setLatestEvent(event);
      setEvents((prev) => [event, ...prev].slice(0, 100));

      // Convert to activity item
      if ('amount' in event.data) {
        const activity: ActivityItem = {
          id: generateId(),
          type: event.type === 'payment_created'
            ? 'payment_created'
            : event.type === 'payment_confirmed'
            ? 'payment_confirmed'
            : 'payment_cancelled',
          message: `Payment ${event.type.replace('payment_', '')}: ${JSON.stringify(event.data)}`,
          timestamp: event.timestamp,
          paymentId: (event.data as Record<string, unknown>).id as number || 0,
        };
        setActivities((prev) => [activity, ...prev].slice(0, 50));
      }
    });

    return () => {
      mountedRef.current = false;
      stop();
      unsubscribe();
      stopEventPolling();
      setIsPolling(false);
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setActivities([]);
    setLatestEvent(null);
  }, []);

  const addActivity = useCallback((item: ActivityItem) => {
    setActivities((prev) => [item, ...prev].slice(0, 50));
  }, []);

  return {
    events,
    activities,
    isPolling,
    latestEvent,
    clearEvents,
    addActivity,
  };
}
