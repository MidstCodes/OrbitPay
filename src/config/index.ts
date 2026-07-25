/**
 * Application configuration for OrbitPay.
 * Loads environment variables and provides typed configuration.
 */

export interface AppConfig {
  appName: string;
  appUrl: string;
  network: 'testnet' | 'mainnet';
  paymentContractAddress: string;
  notificationContractAddress: string;
  historyContractAddress: string;
  horizonUrl: string;
  rpcUrl: string;
  networkPassphrase: string;
  enableAnalytics: boolean;
  enableEvents: boolean;
  pollIntervalMs: number;
}

/**
 * Loads and validates application configuration from environment variables.
 * Provides sensible defaults for development.
 */
export function loadConfig(): AppConfig {
  const network = (process.env.NEXT_PUBLIC_NETWORK || 'testnet') as 'testnet' | 'mainnet';

  const configs: Record<string, Partial<AppConfig>> = {
    testnet: {
      horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org',
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://soroban-testnet.stellar.org',
      networkPassphrase:
        process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
    },
    mainnet: {
      horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon.stellar.org',
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://soroban.stellar.org',
      networkPassphrase:
        process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
        'Public Global Stellar Network ; September 2015',
    },
  };

  const networkConfig = configs[network] || configs.testnet;

  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'OrbitPay',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    network,
    paymentContractAddress: process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS || '',
    notificationContractAddress: process.env.NEXT_PUBLIC_NOTIFICATION_CONTRACT_ADDRESS || '',
    historyContractAddress: process.env.NEXT_PUBLIC_HISTORY_CONTRACT_ADDRESS || '',
    horizonUrl: networkConfig.horizonUrl || '',
    rpcUrl: networkConfig.rpcUrl || '',
    networkPassphrase: networkConfig.networkPassphrase || '',
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableEvents: process.env.NEXT_PUBLIC_ENABLE_EVENTS !== 'false',
    pollIntervalMs: parseInt(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS || '5000', 10),
  };
}

/** Singleton configuration instance */
let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

/** Reset configuration (useful for testing) */
export function resetConfig(): void {
  _config = null;
}
