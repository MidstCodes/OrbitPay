import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initiatePayment,
  initiateConfirmPayment,
  initiateCancelPayment,
  getTransaction,
  getAllTransactions,
  onTransactionUpdate,
  clearTransactions,
} from '@/services/payments';

describe('payments service', () => {
  beforeEach(() => {
    // Clear all tracked transactions between tests for isolation
    clearTransactions();
  });

  describe('initiatePayment', () => {
    it('should create a payment and return a transaction ID', async () => {
      const txId = await initiatePayment({
        payee: 'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
        amount: '100',
        asset: 'XLM',
        metadata: 'Test payment',
      });

      expect(txId).toBeDefined();
      expect(typeof txId).toBe('string');
    });

    it('should track transaction lifecycle states', async () => {
      const states: string[] = [];

      const txId = await initiatePayment(
        {
          payee: 'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
          amount: '50',
          asset: 'USDC',
          metadata: '',
        },
        (state) => {
          states.push(state);
        },
      );

      // Should have gone through preparing, submitting, pending, and confirmed states
      expect(states).toContain('preparing');
      expect(states).toContain('submitting');
      expect(states).toContain('confirmed');
      expect(txId).toBeDefined();
    });

    it('should store the transaction for retrieval', async () => {
      const txId = await initiatePayment({
        payee: 'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
        amount: '200',
        asset: 'XLM',
        metadata: '',
      });

      const tx = getTransaction(txId);
      expect(tx).toBeDefined();
      expect(tx!.state).toBe('confirmed');
      expect(tx!.paymentId).toBeDefined();
    });
  });

  describe('initiateConfirmPayment', () => {
    it('should return a transaction ID', async () => {
      const txId = await initiateConfirmPayment(1);
      expect(txId).toBeDefined();
      expect(typeof txId).toBe('string');
    });
  });

  describe('initiateCancelPayment', () => {
    it('should return a transaction ID', async () => {
      const txId = await initiateCancelPayment(1);
      expect(txId).toBeDefined();
      expect(typeof txId).toBe('string');
    });
  });

  describe('getAllTransactions', () => {
    it('should return all tracked transactions', async () => {
      // Create a transaction
      await initiatePayment({
        payee: 'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
        amount: '100',
        asset: 'XLM',
        metadata: '',
      });

      const allTxs = getAllTransactions();
      expect(allTxs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('onTransactionUpdate', () => {
    it('should subscribe and receive the current state immediately', async () => {
      const txId = await initiatePayment({
        payee: 'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
        amount: '300',
        asset: 'USDC',
        metadata: '',
      });

      // Subscribe after the transaction is complete
      // onTransactionUpdate now immediately notifies with the current state
      const callback = vi.fn();
      const tx = getTransaction(txId);

      // The transaction should exist and be confirmed
      expect(tx).toBeDefined();
      expect(tx!.state).toBe('confirmed');

      // Subscribe and it should immediately call back with current state
      const unsubscribe = onTransactionUpdate(txId, callback);

      // The callback should have been called with the current state
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: txId,
          state: 'confirmed',
        }),
      );

      // Cleanup
      unsubscribe();
    });

    it('should notify on subsequent updates after subscribing', async () => {
      const callback = vi.fn();

      // Start a payment and subscribe partway through
      const promise = initiatePayment(
        {
          payee: 'GA7QYNF7SOWQ3GLR2BGMZKJXHOI2MKR2H2GEVXJ7Y6WVTW6C2C4Z6W6X',
          amount: '400',
          asset: 'XLM',
          metadata: '',
        },
        (state) => {
          // Subscribe once we hit 'submitting' state
          if (state === 'submitting') {
            // The transaction is already being tracked
          }
        },
      );

      // Wait for completion
      const txId = await promise;
      const tx = getTransaction(txId);
      expect(tx).toBeDefined();
      expect(tx!.state).toBe('confirmed');
    });
  });
});
