import { z } from 'zod';
import { wdkService } from '../../wdk/WDKService';
import { getTokenInfo } from '../../tokens/storage';

export const transferSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'solana']).describe('EVM or Solana chain'),
  token: z.string().describe('Token symbol (e.g., USDT, USDC)'),
  to: z.string().describe('Recipient address'),
  amount: z.string().describe('Amount to transfer'),
});

export const transferMetadata = {
  uiDescription: 'Transfer tokens to another address. Works on EVM chains and Solana.',
  tags: ['wallet', 'token', 'transfer'],
  requiredTools: [] as string[],
  packages: ['@tetherto/wdk-wallet-evm', '@tetherto/wdk-wallet-solana'],
  parameters: {
    chain: { type: 'string', description: 'Chain: ethereum, polygon, arbitrum, solana', required: true },
    token: { type: 'string', description: 'Token symbol: USDT, USDC, etc.', required: true },
    to: { type: 'string', description: 'Recipient address', required: true },
    amount: { type: 'string', description: 'Amount to transfer (e.g., "100")', required: true },
  },
};

export const transferTool = {
  type: 'function' as const,
  name: 'transfer',
  description: "Transfer tokens. Args: chain (ethereum/polygon/arbitrum/solana), token (USDT, USDC), to (address), amount",
  parameters: transferSchema,
  metadata: transferMetadata,
  execute: async ({ chain, token, to, amount }: { chain: string; token: string; to: string; amount: string }) => {
    try {
      const tokenInfo = getTokenInfo(chain, token);
      if (!tokenInfo) {
        return `Error: Token ${token} not found on ${chain}`;
      }
      if (tokenInfo.contractAddress === 'native') {
        return `Error: Use send_native tool for native currency transfers`;
      }

      let result;
      if (chain === 'solana') {
        result = await wdkService.transferSolana(
          tokenInfo.contractAddress,
          to,
          amount,
          tokenInfo.decimals
        );
      } else {
        result = await wdkService.transfer(
          chain as 'ethereum' | 'polygon' | 'arbitrum',
          tokenInfo.contractAddress,
          to,
          amount,
          tokenInfo.decimals
        );
      }

      return `Transfer sent! Hash: ${result.hash} Fee: ${result.fee}`;
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};
