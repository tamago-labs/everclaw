import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';

declare global {
  interface Window {
    everclawAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      toggleTheme: () => void;
      onThemeChanged: (cb: () => void) => () => void;
      wdk: {
        getStatus: () => Promise<{
          isInitialized: boolean;
          hasStoredSeed: boolean;
          isEncryptionAvailable: boolean;
          storageBackend?: string;
        }>;
        generateMnemonic: (words?: 12 | 24) => Promise<string>;
        validateSeedPhrase: (seedPhrase: string) => Promise<boolean>;
        createWallet: (words?: 12 | 24) => Promise<string>;
        restoreWallet: (seedPhrase: string) => Promise<boolean>;
        initializeFromStored: () => Promise<boolean>;
        deleteWallet: () => Promise<boolean>;
        revealSeedPhrase: () => Promise<string>;
        getAccounts: () => Promise<Array<{
          chain: string;
          chainId: string;
          address: string;
        }>>;
        getAddress: (chain: 'ethereum' | 'solana' | 'bitcoin') => Promise<string>;
        getBalance: (chain: 'ethereum' | 'solana' | 'bitcoin') => Promise<string>;
        signMessageEvm: (message: string) => Promise<string>;
        signMessageSolana: (message: string) => Promise<string>;
      };
    };
  }
}

interface AccountInfo {
  chain: string;
  chainId: string;
  address: string;
}

interface WalletStatus {
  isInitialized: boolean;
  hasStoredSeed: boolean;
  isEncryptionAvailable: boolean;
  storageBackend?: string;
}

interface WalletState {
  hasWallet: boolean;
  isInitialized: boolean;
  accounts: AccountInfo[];
  isLoading: boolean;
  status: WalletStatus | null;
}

interface WalletContextType extends WalletState {
  createWallet: (words?: 12 | 24) => Promise<string>;
  restoreWallet: (seedPhrase: string) => Promise<boolean>;
  deleteWallet: () => Promise<boolean>;
  revealSeedPhrase: () => Promise<string>;
  refreshData: () => Promise<void>;
  resetWallet: () => void;
  generateMnemonic: (words?: 12 | 24) => Promise<string>;
  validateSeedPhrase: (seedPhrase: string) => Promise<boolean>;
}

const defaultState: WalletState = {
  hasWallet: false,
  isInitialized: false,
  accounts: [],
  isLoading: true,
  status: null,
};

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(defaultState);
  const isDeletedRef = useRef(false);

  const refreshData = useCallback(async () => {
    try {
      const status = await window.everclawAPI.wdk.getStatus();
      
      let accounts: AccountInfo[] = [];
      
      if (status.isInitialized) {
        try {
          accounts = await window.everclawAPI.wdk.getAccounts();
        } catch (e) {
          console.warn('Could not get accounts:', e);
        }
      }

      setState(prev => ({
        ...prev,
        status,
        hasWallet: status.hasStoredSeed,
        isInitialized: status.isInitialized,
        accounts,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to refresh wallet data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Initial load - try to initialize from stored seed
  useEffect(() => {
    if (isDeletedRef.current) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const init = async () => {
      try {
        const status = await window.everclawAPI.wdk.getStatus();
        if (status.hasStoredSeed && !status.isInitialized) {
          await window.everclawAPI.wdk.initializeFromStored();
        }
        await refreshData();
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };
    init();
  }, [refreshData]);

  // Generate mnemonic
  const generateMnemonic = useCallback(async (words?: 12 | 24) => {
    return window.everclawAPI.wdk.generateMnemonic(words);
  }, []);

  // Validate seed phrase
  const validateSeedPhrase = useCallback(async (seedPhrase: string) => {
    return window.everclawAPI.wdk.validateSeedPhrase(seedPhrase);
  }, []);

  // Create wallet
  const createWallet = useCallback(async (words?: 12 | 24) => {
    isDeletedRef.current = false;
    const seedPhrase = await window.everclawAPI.wdk.createWallet(words);
    await refreshData();
    return seedPhrase;
  }, [refreshData]);

  // Restore wallet
  const restoreWallet = useCallback(async (seedPhrase: string) => {
    isDeletedRef.current = false;
    const success = await window.everclawAPI.wdk.restoreWallet(seedPhrase);
    await refreshData();
    return success;
  }, [refreshData]);

  // Delete wallet
  const deleteWallet = useCallback(async () => {
    const success = await window.everclawAPI.wdk.deleteWallet();
    isDeletedRef.current = true;
    setState({
      ...defaultState,
      isLoading: false,
    });
    return success;
  }, []);

  // Reveal seed phrase
  const revealSeedPhrase = useCallback(async () => {
    return window.everclawAPI.wdk.revealSeedPhrase();
  }, []);

  // Reset
  const resetWallet = useCallback(() => {
    isDeletedRef.current = true;
    setState({
      ...defaultState,
      isLoading: false,
    });
  }, []);

  const value: WalletContextType = {
    ...state,
    createWallet,
    restoreWallet,
    deleteWallet,
    revealSeedPhrase,
    refreshData,
    resetWallet,
    generateMnemonic,
    validateSeedPhrase,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}