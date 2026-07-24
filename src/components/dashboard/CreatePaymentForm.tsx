'use client';

/**
 * Create Payment form component.
 * Handles payment creation with input validation, asset selection,
 * and real-time transaction state feedback.
 */

import React, { useState } from 'react';
import { TransactionState } from '@/types';
import { SUPPORTED_ASSETS } from '@/constants';
import { TransactionStateBadge } from '@/components/ui/StatusBadge';
import { isValidStellarAddress, isValidAmount } from '@/lib/utils';

interface CreatePaymentFormProps {
  onSubmit: (data: { payee: string; amount: string; asset: string; metadata: string }) => Promise<void>;
  onCancel: () => void;
  isCreating: boolean;
  transactionState: TransactionState;
}

export function CreatePaymentForm({
  onSubmit,
  onCancel,
  isCreating,
  transactionState,
}: CreatePaymentFormProps) {
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('XLM');
  const [metadata, setMetadata] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!payee.trim()) {
      newErrors.payee = 'Recipient address is required';
    } else if (!isValidStellarAddress(payee.trim())) {
      newErrors.payee = 'Invalid Stellar address format';
    }

    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (!isValidAmount(amount.trim())) {
      newErrors.amount = 'Amount must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      payee: payee.trim(),
      amount: amount.trim(),
      asset,
      metadata: metadata.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Payee Address */}
      <div>
        <label htmlFor="payee" className="block text-sm font-medium text-gray-700 mb-1.5">
          Recipient Address
        </label>
        <input
          id="payee"
          type="text"
          value={payee}
          onChange={(e) => setPayee(e.target.value)}
          placeholder="GABCDEF...12345"
          className={`input-field font-mono text-sm ${errors.payee ? 'border-red-300 focus:ring-red-500' : ''}`}
          disabled={isCreating}
          aria-invalid={!!errors.payee}
          aria-describedby={errors.payee ? 'payee-error' : undefined}
        />
        {errors.payee && (
          <p id="payee-error" className="text-xs text-red-500 mt-1">{errors.payee}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Stellar address starting with &quot;G&quot;
        </p>
      </div>

      {/* Amount + Asset */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1.5">
            Amount
          </label>
          <input
            id="amount"
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100.00"
            className={`input-field ${errors.amount ? 'border-red-300 focus:ring-red-500' : ''}`}
            disabled={isCreating}
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? 'amount-error' : undefined}
          />
          {errors.amount && (
            <p id="amount-error" className="text-xs text-red-500 mt-1">{errors.amount}</p>
          )}
        </div>
        <div>
          <label htmlFor="asset" className="block text-sm font-medium text-gray-700 mb-1.5">
            Asset
          </label>
          <select
            id="asset"
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="input-field"
            disabled={isCreating}
          >
            {SUPPORTED_ASSETS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metadata */}
      <div>
        <label htmlFor="metadata" className="block text-sm font-medium text-gray-700 mb-1.5">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="metadata"
          type="text"
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          placeholder="Invoice #1024, Subscription payment, etc."
          className="input-field"
          disabled={isCreating}
        />
      </div>

      {/* Transaction State */}
      {isCreating && transactionState !== 'idle' && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Transaction Progress</span>
            <TransactionStateBadge state={transactionState} />
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full transition-all duration-500 animate-pulse"
                 style={{
                   width: transactionState === 'preparing' ? '25%'
                     : transactionState === 'submitting' ? '50%'
                     : transactionState === 'pending' ? '75%'
                     : '100%'
                 }}
            />
          </div>
          <p className="text-xs text-blue-600 mt-2">
            {transactionState === 'preparing' && 'Validating and preparing transaction...'}
            {transactionState === 'submitting' && 'Submitting to Stellar network...'}
            {transactionState === 'pending' && 'Waiting for network confirmation...'}
            {transactionState === 'confirmed' && 'Transaction confirmed!'}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isCreating}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isCreating}
          className="btn-primary flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            'Create Payment'
          )}
        </button>
      </div>
    </form>
  );
}
