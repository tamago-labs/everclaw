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

// @ts-ignore - Solana libraries
import { VersionedTransaction, Transaction } from '@solana/web3.js';

// Solana keypair utilities
import { deriveSolanaKeypair } from '../solana/keypair';

// Storage for seed phrase
import * as storage from './storage';

// @ts-ignore - Swap protocol is ESM module
import SwapProtocolVeloraEvmModule from '@tetherto/wdk-protocol-swap-velora-evm';

const SwapProtocolVeloraEvm = (SwapProtocolVeloraEvmModule as any).default || SwapProtocolVeloraEvmModule;

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
     * Get swap protocol for EVM chain (Velora)
     */
    getSwapProtocol(chain: 'ethereum' | 'polygon' | 'arbitrum'): any {
        if (!wdkInstance) throw new Error('WDK not initialized');
        const account = wdkInstance.getAccount(chain, 0);
        return new SwapProtocolVeloraEvm(account, {
            swapMaxFee: 500000000000000n // 0.0005 ETH max fee
        });
    }

    /**
     * Quote a token swap (EVM only, Velora)
     */
    async quoteSwap(
        chain: 'ethereum' | 'polygon' | 'arbitrum',
        tokenInAddress: string,
        tokenOutAddress: string,
        amountIn: string,
        decimals: number
    ): Promise<{ tokenInAmount: string; tokenOutAmount: string; fee: string }> {
        const protocol = this.getSwapProtocol(chain);
        
        // Convert human-readable amount to base units
        const baseAmount = BigInt(amountIn) * BigInt(10 ** decimals);
        
        const quote = await protocol.quoteSwap({
            tokenIn: tokenInAddress,
            tokenOut: tokenOutAddress,
            tokenInAmount: baseAmount
        });
        
        return {
            tokenInAmount: quote.tokenInAmount.toString(),
            tokenOutAmount: quote.tokenOutAmount.toString(),
            fee: quote.fee.toString()
        };
    }

    /**
     * Execute a token swap (EVM only, Velora)
     */
    async executeSwap(
        chain: 'ethereum' | 'polygon' | 'arbitrum',
        tokenInAddress: string,
        tokenOutAddress: string,
        amountIn: string,
        decimals: number
    ): Promise<{ hash: string; tokenInAmount: string; tokenOutAmount: string; fee: string }> {
        const protocol = this.getSwapProtocol(chain);
        
        // Convert human-readable amount to base units
        const baseAmount = BigInt(amountIn) * BigInt(10 ** decimals);
        
        const result = await protocol.swap({
            tokenIn: tokenInAddress,
            tokenOut: tokenOutAddress,
            tokenInAmount: baseAmount
        });
        
        return {
            hash: result.hash,
            tokenInAmount: result.tokenInAmount.toString(),
            tokenOutAmount: result.tokenOutAmount.toString(),
            fee: result.fee.toString()
        };
    }


    /**
     * Sign a Jupiter swap transaction (base64 Transaction)
     * Returns the signed transaction for execution via Jupiter API
     * 
     * Following Jupiter's official example:
     * https://docs.jup.ag/api/endpoints/sign-and-send-transaction
     */
    async signJupiterTransaction(swapTransactionBase64: string): Promise<{ signedTransaction: string; hash: string }> {
        // Get seed from storage and derive keypair directly
        let seed: string;
        try {
            seed = storage.decryptStoredSeed();
        } catch (error) {
            throw new Error('Failed to decrypt stored seed for signing');
        }
        
        // Derive keypair from seed using our utility
        const keypair = deriveSolanaKeypair(seed);
        console.log(`[WDK] Using derived keypair for signing, public key: ${keypair.publicKey.toBase58()}`);
        
        // Deserialize the base64 transaction
        const txBuffer = Buffer.from(swapTransactionBase64, 'base64');
        
        // Deserialize as VersionedTransaction (Jupiter returns this format)
        const transaction = VersionedTransaction.deserialize(txBuffer);
        console.log('[WDK] Deserialized VersionedTransaction');
        
        // Sign the transaction - Jupiter's transaction already has correct blockhash
        transaction.sign([keypair]);
        console.log('[WDK] Transaction signed');
        
        // Serialize and return
        const signedTransaction = Buffer.from(transaction.serialize()).toString('base64');
        
        return { signedTransaction, hash: '' };
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
