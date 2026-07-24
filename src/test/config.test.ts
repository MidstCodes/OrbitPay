import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig, getConfig, resetConfig } from '@/config';

describe('loadConfig', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('should load default testnet configuration', () => {
    const config = loadConfig();
    expect(config.network).toBe('testnet');
    expect(config.appName).toBe('OrbitPay');
    expect(config.horizonUrl).toContain('horizon-testnet');
  });

  it('should use environment variables when available', () => {
    process.env.NEXT_PUBLIC_NETWORK = 'mainnet';
    process.env.NEXT_PUBLIC_APP_NAME = 'OrbitPay Pro';
    resetConfig();

    const config = loadConfig();
    expect(config.network).toBe('mainnet');
    expect(config.appName).toBe('OrbitPay Pro');

    // Reset
    process.env.NEXT_PUBLIC_NETWORK = 'testnet';
    process.env.NEXT_PUBLIC_APP_NAME = 'OrbitPay';
  });

  it('should return singleton from getConfig', () => {
    const config1 = getConfig();
    const config2 = getConfig();
    expect(config1).toBe(config2);
  });
});
