export interface AccountInfo {
  chain: string;
  chainId: string;        // CAIP-2 chain ID (e.g. "eip155:1", "solana:mainnet")
  address: string;        // Chain-native address
}

export interface WalletStatus {
  isInitialized: boolean;
  hasStoredSeed: boolean;
  isEncryptionAvailable: boolean;
  storageBackend?: string;
}

export type ChainFamily = 'ethereum' | 'polygon' | 'arbitrum' | 'solana' | 'bitcoin';
