import { z } from 'zod';
import { wdkService } from '../../wdk/WDKService';

export const sendNativeSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'solana', 'bitcoin']).describe('Blockchain chain'),
  to: z.string().describe('Recipient address'),
  amount: z.string().describe('Amount in human-readable format'),
});

export const sendNativeMetadata = {
  uiDescription: 'Send native currency (ETH, SOL, BTC, etc.) to another address. Works on all supported chains.',
  tags: ['wallet', 'native', 'send'],
  requiredTools: [] as string[],
  packages: ['@tetherto/wdk-wallet-evm', '@tetherto/wdk-wallet-solana', '@tetherto/wdk-wallet-btc'],
  parameters: {
    chain: { type: 'string', description: 'Chain: ethereum, polygon, arbitrum, solana, bitcoin', required: true },
    to: { type: 'string', description: 'Recipient address', required: true },
    amount: { type: 'string', description: 'Amount to send (e.g., "0.1")', required: true },
  },
};

export const sendNativeTool = {
  type: 'function' as const,
  name: 'send_native',
  description: "Send native currency. Args: chain (ethereum/polygon/arbitrum/solana/bitcoin), to (address), amount",
  parameters: sendNativeSchema,
  metadata: sendNativeMetadata,
  execute: async ({ chain, to, amount }: { chain: string; to: string; amount: string }) => {
    try {
      // Get decimals for the chain
      const chainDecimals: Record<string, number> = {
        ethereum: 18,
        polygon: 18,
        arbitrum: 18,
        solana: 9,
        bitcoin: 8,
      };
      const decimals = chainDecimals[chain] || 18;
      
      // Convert to base units
      const baseAmount = (BigInt(amount) * BigInt(10 ** decimals)).toString();
      
      const result = await wdkService.sendNative(
        chain as 'ethereum' | 'polygon' | 'arbitrum' | 'solana' | 'bitcoin',
        to,
        baseAmount
      );

      return `Transaction sent! Hash: ${result.hash} Fee: ${result.fee}`;
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};