/**
 * Event streaming service for OrbitPay.
 * Manages real-time event synchronization with the Stellar network.
 */

import { Payment, PaymentEvent, ActivityItem } from '@/types';
import { generateId } from '@/lib/utils';
import { POLL_INTERVAL_MS } from '@/constants';

// ============================================================================
// Event Bus
// ============================================================================

type EventHandler = (event: PaymentEvent) => void;

/** Registered event handlers by event type */
const handlers = new Map<string, Set<EventHandler>>();

/** Global event handler for all events */
const globalHandlers = new Set<EventHandler>();

/** Active polling interval ID */
let pollingInterval: ReturnType<typeof setInterval> | null = null;

/** Track seen event IDs to prevent duplicates */
const seenEvents = new Set<string>();

// ============================================================================
// Public API
// ============================================================================

/**
 * Starts listening for contract events via Horizon polling.
 * Automatically handles reconnection after network failures.
 */
export function startEventPolling(): () => void {
  if (pollingInterval) {
    return () => stopEventPolling();
  }

  // Poll for new events
  pollForEvents();
  pollingInterval = setInterval(pollForEvents, POLL_INTERVAL_MS);

  return () => stopEventPolling();
}

/**
 * Stops the event polling loop.
 */
export function stopEventPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

/**
 * Subscribes to events of a specific type.
 * Returns an unsubscribe function.
 */
export function subscribeToEvents(type: string, handler: EventHandler): () => void {
  if (!handlers.has(type)) {
    handlers.set(type, new Set());
  }
  handlers.get(type)!.add(handler);

  return () => {
    handlers.get(type)?.delete(handler);
  };
}

/**
 * Subscribes to all payment events.
 * Returns an unsubscribe function.
 */
export function subscribeToAllEvents(handler: EventHandler): () => void {
  globalHandlers.add(handler);
  return () => globalHandlers.delete(handler);
}

/**
 * Dispatches an event to all registered handlers.
 */
export function dispatchEvent(event: PaymentEvent): void {
  const eventId = `${event.type}-${event.timestamp}-${JSON.stringify(event.data)}`;

  // Prevent duplicate events
  if (seenEvents.has(eventId)) return;
  seenEvents.add(eventId);

  // Limit seen events to prevent memory leak
  if (seenEvents.size > 1000) {
    const firstKey = seenEvents.values().next().value;
    if (firstKey) seenEvents.delete(firstKey);
  }

  // Dispatch to type-specific handlers
  const typeHandlers = handlers.get(event.type);
  typeHandlers?.forEach((handler) => {
    try {
      handler(event);
    } catch (error) {
      console.error(`Event handler error for ${event.type}:`, error);
    }
  });

  // Dispatch to global handlers
  globalHandlers.forEach((handler) => {
    try {
      handler(event);
    } catch (error) {
      console.error('Global event handler error:', error);
    }
  });
}

/**
 * Converts a Payment object into an ActivityItem for the feed.
 * Used by components to display payment events in the activity feed.
 */
export function paymentToActivity(payment: Payment): ActivityItem {
  const typeMap: Record<string, 'payment_created' | 'payment_confirmed' | 'payment_cancelled'> = {
    Pending: 'payment_created',
    Confirmed: 'payment_confirmed',
    Cancelled: 'payment_cancelled',
  };

  const messageMap: Record<string, string> = {
    payment_created: `Payment #${payment.id} created — ${Number(payment.amount) / 10_000_000} ${payment.asset}`,
    payment_confirmed: `Payment #${payment.id} confirmed — ${Number(payment.amount) / 10_000_000} ${payment.asset}`,
    payment_cancelled: `Payment #${payment.id} cancelled — ${Number(payment.amount) / 10_000_000} ${payment.asset}`,
  };

  const type = typeMap[payment.status] || 'payment_created';

  return {
    id: generateId(),
    type,
    message: messageMap[type],
    timestamp: payment.updated_at,
    paymentId: payment.id,
  };
}

// ============================================================================
// Internal Event Polling
// ============================================================================

/**
 * Polls Horizon for new contract events.
 * In production, this would query the Soroban RPC endpoint for contract events.
 */
async function pollForEvents(): Promise<void> {
  try {
    // In production, this would query Horizon for contract events:
    // const server = new SorobanClient.Server(config.rpcUrl);
    // const events = await server.getEvents({
    //   contractIds: [config.paymentContractAddress],
    //   startLedger: lastProcessedLedger,
    // });

    // For development, simulate events from our demo data
    const payments = await getDemoPayments();
    for (const payment of payments) {
      const event: PaymentEvent = {
        type:
          payment.status === 'Pending'
            ? 'payment_created'
            : payment.status === 'Confirmed'
              ? 'payment_confirmed'
              : 'payment_cancelled',
        data: { ...payment, amount: Number(payment.amount) },
        timestamp: payment.updated_at,
      };

      dispatchEvent(event);
    }
  } catch (error) {
    console.error('Event polling error:', error);
    // Reconnect is automatic on next interval
  }
}

/**
 * Returns demo payments for event simulation.
 * In production, this would query Horizon for real events.
 */
async function getDemoPayments(): Promise<Payment[]> {
  // Simulate periodic new payment creation for demo purposes
  // In production, real events come from Horizon
  return [];
}
