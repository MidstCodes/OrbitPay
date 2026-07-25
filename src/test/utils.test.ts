import { describe, it, expect } from 'vitest';
import {
  truncateAddress,
  truncateHash,
  isValidStellarAddress,
  formatTimestamp,
  formatRelativeTime,
  getStatusLabel,
  getStatusColor,
  isValidAmount,
  generateId,
  filterByQuery,
  sortByKey,
  copyToClipboard,
} from '@/lib/utils';

describe('truncateAddress', () => {
  it('should truncate a Stellar address with default chars', () => {
    const address = 'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X';
    const result = truncateAddress(address);
    expect(result).toBe('GA7QY...6W6X');
  });

  it('should return short addresses unchanged', () => {
    expect(truncateAddress('ABC')).toBe('ABC');
  });

  it('should use custom char count', () => {
    const address = 'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X';
    const result = truncateAddress(address, 6);
    expect(result).toContain('...');
    expect(result.length).toBeLessThan(address.length);
  });
});

describe('truncateHash', () => {
  it('should truncate a transaction hash', () => {
    const hash = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6';
    const result = truncateHash(hash);
    expect(result).toContain('...');
  });
});

describe('isValidStellarAddress', () => {
  it('should validate a correct Stellar address', () => {
    expect(isValidStellarAddress('GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X')).toBe(
      true,
    );
  });

  it('should reject an invalid Stellar address', () => {
    expect(isValidStellarAddress('invalid')).toBe(false);
  });

  it('should reject a lowercase address', () => {
    expect(isValidStellarAddress('ga7qynf7sowq3glr2bgmzkjxhoi2mkr2h2gevxj7y6wvtw6c2c4z6w6x')).toBe(
      false,
    );
  });

  it('should reject an empty string', () => {
    expect(isValidStellarAddress('')).toBe(false);
  });
});

describe('formatTimestamp', () => {
  it('should format a Unix timestamp', () => {
    const timestamp = 1700000000;
    const result = formatTimestamp(timestamp);
    expect(result).toContain('2023');
    expect(result).toContain(':');
  });
});

describe('formatRelativeTime', () => {
  it('should return "just now" for current time', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('should return minutes ago', () => {
    const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
    expect(formatRelativeTime(fiveMinAgo)).toContain('m ago');
  });

  it('should return hours ago', () => {
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
    expect(formatRelativeTime(twoHoursAgo)).toContain('h ago');
  });

  it('should return days ago', () => {
    const threeDaysAgo = Math.floor(Date.now() / 1000) - 259200;
    expect(formatRelativeTime(threeDaysAgo)).toContain('d ago');
  });
});

describe('getStatusLabel', () => {
  it('should return proper labels', () => {
    expect(getStatusLabel('Pending')).toBe('Pending');
    expect(getStatusLabel('Confirmed')).toBe('Confirmed');
    expect(getStatusLabel('Cancelled')).toBe('Cancelled');
  });
});

describe('getStatusColor', () => {
  it('should return appropriate color classes', () => {
    expect(getStatusColor('Pending')).toContain('yellow');
    expect(getStatusColor('Confirmed')).toContain('emerald');
    expect(getStatusColor('Cancelled')).toContain('red');
  });
});

describe('isValidAmount', () => {
  it('should validate positive numbers', () => {
    expect(isValidAmount('100')).toBe(true);
    expect(isValidAmount('0.5')).toBe(true);
    expect(isValidAmount('1000.00')).toBe(true);
  });

  it('should reject invalid inputs', () => {
    expect(isValidAmount('')).toBe(false);
    expect(isValidAmount('-100')).toBe(false);
    expect(isValidAmount('abc')).toBe(false);
    expect(isValidAmount('0')).toBe(false);
  });
});

describe('generateId', () => {
  it('should generate a unique ID', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
  });
});

describe('filterByQuery', () => {
  it('should filter items by query', () => {
    const items = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ];
    const result = filterByQuery(items, 'alice', ['name']);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('should return all items for empty query', () => {
    const items = [{ id: 1 }, { id: 2 }];
    expect(filterByQuery(items, '', ['id'])).toHaveLength(2);
  });
});

describe('sortByKey', () => {
  it('should sort ascending', () => {
    const items = [{ id: 3 }, { id: 1 }, { id: 2 }];
    const result = sortByKey(items, 'id', 'asc');
    expect(result[0].id).toBe(1);
    expect(result[2].id).toBe(3);
  });

  it('should sort descending', () => {
    const items = [{ id: 1 }, { id: 3 }, { id: 2 }];
    const result = sortByKey(items, 'id', 'desc');
    expect(result[0].id).toBe(3);
    expect(result[2].id).toBe(1);
  });
});

describe('copyToClipboard', () => {
  it('should attempt to copy text to clipboard', async () => {
    // In jsdom environment, clipboard may not work, but the function should not throw
    const result = await copyToClipboard('test text');
    // Result depends on environment - just ensure it returns a boolean
    expect(typeof result).toBe('boolean');
  });
});
