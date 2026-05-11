interface WDKStatus {
  isInitialized: boolean;
  hasStoredSeed: boolean;
  isEncryptionAvailable: boolean;
  storageBackend?: string;
}

interface AccountInfo {
  chain: string;
  chainId: string;
  address: string;
}

interface ModelInfo {
  name: string;
  specs: string;
  recommended: string;
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
  modelType?: '4B' | '1.7B';
}

interface ToolParameter {
  type: string;
  description?: string;
  required: boolean;
}

interface ToolInfo {
  name: string;
  description: string;       // Short description for AI
  uiDescription?: string;     // Long description for UI
  tags?: string[];            // Tags for organization
  requiredTools?: string[];   // Dependencies
  parameters: Record<string, ToolParameter>;
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
    getModels: () => Promise<Record<'4B' | '1.7B', ModelInfo>>;
    selectModel: (modelType: '4B' | '1.7B') => Promise<AIResult>;
    loadModel: () => Promise<AIResult>;
    // sendPrompt: (message: string, history?: { role: string; content: string }[]) => Promise<AIResult>;
    unloadModel: () => Promise<AIResult>;
    onStreamToken: (callback: (token: string) => void) => void;
    removeStreamTokenListener: (callback: (...args: any[]) => void) => void;
    onStreamThinking: (callback: (token: string) => void) => void;
    removeStreamThinkingListener: (callback: (...args: any[]) => void) => void;
  };

  // Pricing operations
  pricing: {
    getLastPrice: (symbol: string) => Promise<number>;
    getPrices: (symbols: string[]) => Promise<Record<string, number>>;
  };

  // Tools operations
  tools: {
    list: () => Promise<{ name: string; enabled: boolean }[]>;
    getInfo: () => Promise<ToolInfo[]>;
    toggle: (toolName: string, enabled: boolean) => Promise<{ success: boolean }>;
  };

  // Agents operations
  agents: {
    list: () => Promise<{ slug: string; sessionsCount?: number; workspacesCount?: number }[]>;
    create: (name: string) => Promise<{ slug: string }>;
    delete: (slug: string) => Promise<{ success: boolean }>;
    get: (slug: string) => Promise<any>;
    init: () => Promise<{ success: boolean }>;
    getSystemPrompt: (slug: string) => Promise<string>;
    workspace: {
      files: (slug: string) => Promise<string[]>;
      read: (slug: string, filename: string) => Promise<{ filename: string; content: string }>;
      write: (slug: string, filename: string, content: string) => Promise<{ success: boolean }>;
    };
  };

  // Sessions operations
  sessions: {
    list: (agentSlug: string) => Promise<string[]>;
    create: (agentSlug: string, name: string) => Promise<{ slug: string }>;
    delete: (agentSlug: string, sessionSlug: string) => Promise<{ success: boolean }>;
    get: (agentSlug: string, sessionSlug: string) => Promise<any>;
    ensureMain: (agentSlug: string) => Promise<{ success: boolean }>;
    saveMessages: (agentSlug: string, sessionSlug: string, messages: any[]) => Promise<{ success: boolean }>;
    loadMessages: (agentSlug: string, sessionSlug: string) => Promise<any[]>;
    getAllSessions: () => Promise<any[]>;
  };
}

declare global {
  interface Window {
    everclawAPI: EverclawAPI;
  }
}

export { EverclawAPI, WDKStatus, AccountInfo, AIStatus, AIResult, ToolInfo };