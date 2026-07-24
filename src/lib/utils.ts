/**
 * Utility functions for OrbitPay.
 * Pure helper functions with no side effects.
 */

// ============================================================================
// String / Address Utilities
// ============================================================================

/** Truncates a Stellar address for display (e.g., "GABC...1234") */
export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars + 1)}...${address.slice(-chars)}`;
}

/** Truncates a transaction hash for display */
export function truncateHash(hash: string, chars = 8): string {
  if (!hash || hash.length < chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

/** Validates a Stellar public key format */
export function isValidStellarAddress(address: string): boolean {
  // Stellar addresses start with G and are 56 characters long (base32)
  return /^G[A-Z2-7]{55}$/.test(address);
}

/** Formats a bigint amount into a human-readable string with asset code */
export function formatAmount(amount: bigint | number, asset: string, decimals = 7): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount;
  const divisor = Math.pow(10, decimals);
  const formatted = (num / divisor).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${asset}`;
}

/** Formats a Unix timestamp into a human-readable date string */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formats a relative time string (e.g., "2 minutes ago", "1 hour ago") */
export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatTimestamp(timestamp);
}

// ============================================================================
// Status Utilities
// ============================================================================

/** Returns a human-readable label for a payment status */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'Pending':
      return 'Pending';
    case 'Confirmed':
      return 'Confirmed';
    case 'Cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

/** Returns a Tailwind CSS color class for a payment status */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Confirmed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/** Returns a Tailwind CSS color class for a transaction state */
export function getTransactionStateColor(state: string): string {
  switch (state) {
    case 'preparing':
    case 'awaiting_approval':
    case 'signing':
      return 'text-blue-600';
    case 'submitting':
    case 'pending':
      return 'text-yellow-600';
    case 'confirmed':
      return 'text-emerald-600';
    case 'failed':
    case 'rejected':
    case 'timed_out':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

// ============================================================================
// Clipboard Utilities
// ============================================================================

/** Copies text to clipboard with fallback */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// ID Generation
// ============================================================================

/** Generates a unique ID for UI elements (toasts, activities, etc.) */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Array / Collection Utilities
// ============================================================================

/** Filters an array of items by a search query across specified keys */
export function filterByQuery<T>(
  items: T[],
  query: string,
  keys: (keyof T)[]
): T[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return items;

  return items.filter((item) =>
    keys.some((key) => {
      const value = item[key];
      return String(value).toLowerCase().includes(lowerQuery);
    })
  );
}

/** Sorts an array by a specified key */
export function sortByKey<T>(
  items: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'desc'
): T[] {
  return [...items].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// ============================================================================
// Validation Utilities
// ============================================================================

export function isValidAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && /^\d+(\.\d+)?$/.test(amount);
}

export function isNotEmptyString(value: string): boolean {
  return value.trim().length > 0;
}
