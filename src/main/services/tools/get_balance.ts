import { z } from 'zod';
import { getAllBalances } from '../balances/storage';

export const getBalanceSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'solana', 'bitcoin']).describe('Blockchain chain name'),
});

// Tool metadata for UI
export const getBalanceMetadata = {
  uiDescription: 'Get native and token balances for a specific blockchain chain. Returns the native token balance (ETH, POL, SOL, BTC) plus any configured token balances with their USD values.',
  tags: ['wallet', 'ethereum', 'polygon', 'arbitrum', 'solana', 'bitcoin'],
  requiredTools: [] as string[],
  parameters: {
    chain: { type: 'string', description: 'Chain name (required): ethereum, polygon, arbitrum, solana, bitcoin', required: true },
  },
};

export const getBalanceTool = {
  type: 'function' as const,
  name: 'get_balance',
  description: "Get the user's wallet balance on a blockchain chain. Supported chains: ethereum, polygon, arbitrum, solana, bitcoin",
  parameters: getBalanceSchema,
  metadata: getBalanceMetadata,
  execute: async ({ chain }: { chain: string }) => {
    try {
      // Get all balances
      const allBalances = await getAllBalances();
      
      // Find balance for the requested chain
      const chainBalance = allBalances.find(b => b.chain === chain);
      
      if (!chainBalance) {
        return JSON.stringify({ 
          chain,
          nativeToken: '0',
          nativeValue: '$0',
          tokens: [] 
        });
      }
      
      return JSON.stringify({
        chain: chainBalance.chain,
        nativeToken: chainBalance.nativeBalanceFormatted,
        nativeValue: chainBalance.nativeValue,
        tokens: chainBalance.tokens.map(t => ({
          symbol: t.symbol,
          balance: t.balanceFormatted,
          value: t.value,
        })),
      });
    } catch (error) {
      return `Error getting balance: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};