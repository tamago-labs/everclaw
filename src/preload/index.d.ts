interface WDKStatus {
  isInitialized: boolean;
  hasStoredSeed: boolean;
  isEncryptionAvailable: boolean;
  storageBackend?: string;
  isMCPRunning: boolean;
}

interface AccountInfo {
  chain: string;
  chainId: string;
  address: string;
}

interface AIStatus {
  isReady: boolean;
  modelId: string | null;
}

interface AIResult {
  success: boolean;
  response?: string;
  error?: string;
  modelId?: string;
}

interface EverclawAPI {
  // Window controls
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  toggleTheme: () => void;
  onThemeChanged: (callback: () => void) => () => void;

  // WDK Wallet operations
  wdk: {
    getStatus: () => Promise<WDKStatus>;
    generateMnemonic: (words?: 12 | 24) => Promise<string>;
    validateSeedPhrase: (seedPhrase: string) => Promise<boolean>;
    createWallet: (seedPhrase?: string) => Promise<string>;
    restoreWallet: (seedPhrase: string) => Promise<boolean>;
    initializeFromStored: () => Promise<boolean>;
    deleteWallet: () => Promise<boolean>;
    revealSeedPhrase: () => Promise<string>;
    getAccounts: () => Promise<AccountInfo[]>;
    getAddress: (chain: 'ethereum' | 'polygon' | 'arbitrum' | 'solana' | 'bitcoin') => Promise<string>;
    getBalance: (chain: 'ethereum' | 'polygon' | 'arbitrum' | 'solana' | 'bitcoin') => Promise<string>;
    signMessageEvm: (message: string) => Promise<string>;
    signMessageSolana: (message: string) => Promise<string>;
  };

  // AI (QVAC) operations
  ai: {
    getStatus: () => Promise<AIStatus>;
    loadModel: () => Promise<AIResult>;
    sendPrompt: (message: string, history?: { role: string; content: string }[]) => Promise<AIResult>;
    unloadModel: () => Promise<AIResult>;
  };

  // Pricing operations
  pricing: {
    getLastPrice: (symbol: string) => Promise<number>;
    getPrices: (symbols: string[]) => Promise<Record<string, number>>;
  };
}

declare global {
  interface Window {
    everclawAPI: EverclawAPI;
  }
}

export { EverclawAPI, WDKStatus, AccountInfo, AIStatus, AIResult };