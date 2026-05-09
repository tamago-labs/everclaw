// WDK Service - Wallet management using WDK with EVM and Solana support

// @ts-ignore - WDK is an ESM module with default export
import WDKModule from '@tetherto/wdk';
// @ts-ignore - Wallet managers are ESM modules
import WalletManagerEvmModule from '@tetherto/wdk-wallet-evm';
// @ts-ignore - Wallet managers are ESM modules
import WalletManagerSolanaModule from '@tetherto/wdk-wallet-solana';
// @ts-ignore - Wallet managers are ESM modules
import WalletManagerBtcModule from '@tetherto/wdk-wallet-btc';

import type { AccountInfo } from './types';

// Handle ESM default exports
const WDK = (WDKModule as any).default || WDKModule;
const WalletManagerEvm = (WalletManagerEvmModule as any).default || WalletManagerEvmModule;
const WalletManagerSolana = (WalletManagerSolanaModule as any).default || WalletManagerSolanaModule;
const WalletManagerBtc = (WalletManagerBtcModule as any).default || WalletManagerBtcModule;

let wdkInstance: any = null;

const CHAINS = ['ethereum', 'polygon', 'arbitrum', 'solana', 'bitcoin'] as const;

const CHAIN_IDS: Record<string, string> = {
  ethereum: 'eip155:1',
  polygon: 'eip155:137',
  arbitrum: 'eip155:42161',
  solana: 'solana:mainnet',
  bitcoin: 'bip122:000000000019d6689c085ae165831e93',
};

export class WDKService {
    /**
     * Generate a new BIP-39 mnemonic phrase
     */
    generateMnemonic(words: 12 | 24 = 12): string {
        return WDK.getRandomSeedPhrase(words);
    }

    /**
     * Validate a seed phrase
     */
    isValidSeedPhrase(seedPhrase: string): boolean {
        return WDK.isValidSeed(seedPhrase);
    }

    /**
     * Initialize WDK with a seed phrase and register chain wallets
     */
    initializeWithSeed(seedPhrase: string): any {
        wdkInstance = new WDK(seedPhrase)
            .registerWallet('ethereum', WalletManagerEvm, {
                provider: 'https://eth-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV',
            })
            .registerWallet('polygon', WalletManagerEvm, {
                provider: 'https://polygon-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV',
            })
            .registerWallet('arbitrum', WalletManagerEvm, {
                provider: 'https://arb-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV',
            })
            .registerWallet('solana', WalletManagerSolana, {
                rpcUrl: 'https://solana-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV',
            })
            .registerWallet('bitcoin', WalletManagerBtc, {
                provider: 'https://bitcoin-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV'
            });

        return wdkInstance;
    }

    /**
     * Get the current WDK instance
     */
    getInstance(): any {
        return wdkInstance;
    }

    /**
     * Check if WDK is initialized
     */
    isInitialized(): boolean {
        return wdkInstance !== null;
    }

    /**
     * Get all derived accounts
     */
    async getAccounts(): Promise<AccountInfo[]> {
        if (!wdkInstance) throw new Error('WDK not initialized');

        const accounts: AccountInfo[] = [];

        for (const chain of CHAINS) {
            try {
                const account = await wdkInstance.getAccount(chain, 0);
                const address = await account.getAddress();
                accounts.push({
                    chain,
                    chainId: CHAIN_IDS[chain] || '',
                    address,
                });
            } catch (e) {
                console.warn(`${chain} account not available:`, e);
            }
        }

        return accounts;
    }

    /**
     * Get native balance for a chain
     */
    async getBalance(chain: 'ethereum' | 'polygon' | 'arbitrum' | 'solana' | 'bitcoin'): Promise<string> {
        if (!wdkInstance) throw new Error('WDK not initialized');
        const account = await wdkInstance.getAccount(chain, 0);
        return account.getBalance();
    }

    /**
     * Get address for a specific chain
     */
    async getAddress(chain: 'ethereum' | 'polygon' | 'arbitrum' | 'solana' | 'bitcoin'): Promise<string> {
        if (!wdkInstance) throw new Error('WDK not initialized');
        const account = await wdkInstance.getAccount(chain, 0);
        return account.getAddress();
    }
 
    /**
     * Sign a message on EVM
     */
    async signMessageEvm(message: string): Promise<string> {
        if (!wdkInstance) throw new Error('WDK not initialized');
        const account = await wdkInstance.getAccount('ethereum', 0);
        return account.sign(message);
    }

    /**
     * Sign a message on Solana
     */
    async signMessageSolana(message: string): Promise<string> {
        if (!wdkInstance) throw new Error('WDK not initialized');
        const account = await wdkInstance.getAccount('solana', 0);
        return account.sign(message);
    }

    /**
     * Approve token spending (EVM only)
     */
    async approve(
        chain: 'ethereum' | 'polygon' | 'arbitrum',
        tokenAddress: string,
        spender: string,
        amount: string,
        decimals: number
    ): Promise<{ hash: string; fee: string }> {
        if (!wdkInstance) throw new Error('WDK not initialized');
        const account = await wdkInstance.getAccount(chain, 0);
        
        // Convert human-readable amount to base units
        const baseAmount = (BigInt(amount) * BigInt(10 ** decimals)).toString();
        
        const result = await account.approve({
            token: tokenAddress,
            spender,
            amount: baseAmount,
        });
        
        return {
            hash: result.hash,
            fee: result.fee?.toString() || '0',
        };
    }

    /**
     * Transfer tokens (EVM only)
     */
    async transfer(
        chain: 'ethereum' | 'polygon' | 'arbitrum',
        tokenAddress: string,
        to: string,
        amount: string,
        decimals: number
    ): Promise<{ hash: string; fee: string }> {
        if (!wdkInstance) throw new Error('WDK not initialized');
        const account = await wdkInstance.getAccount(chain, 0);
        
        // Convert human-readable amount to base units
        const baseAmount = (BigInt(amount) * BigInt(10 ** decimals)).toString();
        
        const result = await account.transfer({
            token: tokenAddress,
            recipient: to,
            amount: baseAmount,
        });
        
        return {
            hash: result.hash,
            fee: result.fee?.toString() || '0',
        };
    }

    /**
     * Transfer tokens (Solana)
     */
    async transferSolana(
        tokenAddress: string,
        to: string,
        amount: string,
        decimals: number
    ): Promise<{ hash: string; fee: string }> {
        if (!wdkInstance) throw new Error('WDK not initialized');
        const account = await wdkInstance.getAccount('solana', 0);
        
        const baseAmount = (BigInt(amount) * BigInt(10 ** decimals)).toString();
        
        const result = await account.transfer({
            token: tokenAddress,
            recipient: to,
            amount: baseAmount,
        });
        
        return {
            hash: result.hash,
            fee: result.fee?.toString() || '0',
        };
    }

    /**
     * Send native currency (all chains)
     */
    async sendNative(
        chain: 'ethereum' | 'polygon' | 'arbitrum' | 'solana' | 'bitcoin',
        to: string,
        amount: string
    ): Promise<{ hash: string; fee: string }> {
        if (!wdkInstance) throw new Error('WDK not initialized');
        const account = await wdkInstance.getAccount(chain, 0);
        
        const result = await account.sendTransaction({
            to,
            value: amount,
        });
        
        return {
            hash: result.hash,
            fee: result.fee?.toString() || '0',
        };
    }

    /**
     * Dispose all sensitive data from memory
     */
    dispose(): void {
        if (wdkInstance) {
            wdkInstance.dispose();
            wdkInstance = null;
        }
    }
}

export const wdkService = new WDKService();
