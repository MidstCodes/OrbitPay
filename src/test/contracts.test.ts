import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPayment,
  confirmPayment,
  cancelPayment,
  getPayment,
  fetchAccountBalances,
} from '@/services/contracts';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('contracts service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should throw error for invalid stellar address', async () => {
      await expect(createPayment('invalid', '100', 'XLM', 'test')).rejects.toThrow(
        'Invalid recipient Stellar address',
      );
    });

    it('should throw error for invalid amount', async () => {
      await expect(
        createPayment(
          'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
          '-100',
          'XLM',
          'test',
        ),
      ).rejects.toThrow('Invalid payment amount');
    });

    it('should throw error for empty asset', async () => {
      await expect(
        createPayment(
          'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
          '100',
          '',
          'test',
        ),
      ).rejects.toThrow('Asset code cannot be empty');
    });

    it('should return simulated payment ID in dev mode', async () => {
      const result = await createPayment(
        'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
        '100',
        'XLM',
        'test payment',
      );

      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('txHash');
      expect(result.txHash).toContain('sim-');
    });
  });

  describe('confirmPayment', () => {
    it('should return simulated tx hash in dev mode', async () => {
      const result = await confirmPayment(1);
      expect(result).toHaveProperty('txHash');
      expect(result.txHash).toContain('sim-');
    });
  });

  describe('cancelPayment', () => {
    it('should return simulated tx hash in dev mode', async () => {
      const result = await cancelPayment(1);
      expect(result).toHaveProperty('txHash');
      expect(result.txHash).toContain('sim-');
    });
  });

  describe('getPayment', () => {
    it('should return null for non-existent payment', async () => {
      const result = await getPayment(9999);
      expect(result).toBeNull();
    });
  });

  describe('fetchAccountBalances', () => {
    it('should call Horizon API and parse balances', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          balances: [
            { asset_type: 'native', balance: '100.5000000' },
            { asset_code: 'USDC', asset_type: 'credit_alphanum4', balance: '50.0000000' },
          ],
        }),
      });

      const balances = await fetchAccountBalances(
        'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
      );

      expect(balances).toHaveLength(2);
      expect(balances[0]).toEqual({ asset: 'native', balance: '100.5000000' });
      expect(balances[1]).toEqual({ asset: 'USDC', balance: '50.0000000' });
    });

    it('should return empty array on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const balances = await fetchAccountBalances('invalid');
      expect(balances).toEqual([]);
    });

    it('should return empty array on Horizon error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      const balances = await fetchAccountBalances(
        'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
      );

      expect(balances).toEqual([]);
    });
  });
});
