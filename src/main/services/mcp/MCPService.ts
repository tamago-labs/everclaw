// MCP Service - MCP Server for agents using WDK

// @ts-ignore - MCP toolkit is ESM module
import { WdkMcpServer, CHAINS, WALLET_TOOLS, PRICING_TOOLS } from '@tetherto/wdk-mcp-toolkit';
// @ts-ignore - Wallet managers are ESM modules
import WalletManagerEvmModule from '@tetherto/wdk-wallet-evm';
import WalletManagerBtcModule from '@tetherto/wdk-wallet-btc';
// @ts-ignore - Solana wallet is ESM module
import WalletManagerSolanaModule from '@tetherto/wdk-wallet-solana';
// @ts-ignore - Pricing is ESM module
import { PricingProvider } from '@tetherto/wdk-pricing-provider';
// @ts-ignore - Bitfinex client is ESM module
import { BitfinexPricingClient } from '@tetherto/wdk-pricing-bitfinex-http';
import { listTokens, TokenConfig } from '../tokens/storage';

const WalletManagerEvm = (WalletManagerEvmModule as any).default || WalletManagerEvmModule;
const WalletManagerBtc = (WalletManagerBtcModule as any).default || WalletManagerBtcModule;
const WalletManagerSolana = (WalletManagerSolanaModule as any).default || WalletManagerSolanaModule;

let mcpServer: any = null;
let isRunning = false;

/**
 * Initialize MCP server with wallet seed
 */
export async function initializeMCP(seedPhrase: string): Promise<void> {
    try {

        // Create MCP server
        mcpServer = new WdkMcpServer('everclaw-mcp', '1.0.0')
            .useWdk({ seed: seedPhrase })
            // Register EVM wallets
            .registerWallet('ethereum', WalletManagerEvm, {
                provider: 'https://eth-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV',
            })
            .registerWallet('polygon', WalletManagerEvm, {
                provider: 'https://polygon-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV',
            })
            .registerWallet('arbitrum', WalletManagerEvm, {
                provider: 'https://arb-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV',
            })
            // Register Solana
            .registerWallet('solana', WalletManagerSolana, {
                rpcUrl: 'https://solana-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV',
            })
            // Register Bitcoin
            .registerWallet('bitcoin', WalletManagerBtc, {
                provider: 'https://bitcoin-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV',
            })
            .usePricing();

        // Load tokens from storage
        const allTokens = listTokens();
        const tokensByChain: Record<string, TokenConfig[]> = {};

        for (const token of allTokens) {
            // Skip native tokens (handled by wallet registration)
            if (token.contractAddress === 'native') continue;
            if (!tokensByChain[token.chain]) tokensByChain[token.chain] = [];
            tokensByChain[token.chain].push(token);
        }

        // Register tokens for each chain
        for (const [chain, chainTokens] of Object.entries(tokensByChain)) {
            for (const token of chainTokens) {
                mcpServer.registerToken(chain, token.symbol, {
                    address: token.contractAddress,
                    decimals: token.decimals,
                });
            }
        }

        // Register wallet and pricing tools
        const tools = [...WALLET_TOOLS, ...PRICING_TOOLS];
        mcpServer.registerTools(tools);

        console.log('[MCP] Server created, registered chains:', mcpServer.getChains());
        isRunning = true;
    } catch (error) {
        console.error('[MCP] Failed to initialize:', error);
        throw error;
    }
}

/**
 * Check if MCP is running
 */
export function isMCPRunning(): boolean {
    return isRunning;
}

/**
 * Get MCP server instance
 */
export function getMCPServer(): any {
    return mcpServer;
}

/**
 * Dispose MCP server
 */
export function disposeMCP(): void {
    if (mcpServer) {
        mcpServer = null;
        isRunning = false;
    }
}