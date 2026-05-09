import { z } from 'zod';
import { wdkService } from '../../wdk/WDKService';
import { getTokenInfo } from '../../tokens/storage';

export const approveSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'arbitrum']).describe('EVM chain'),
  token: z.string().describe('Token symbol (e.g., USDT, USDC)'),
  spender: z.string().describe('Spender address'),
  amount: z.string().describe('Amount to approve'),
});

export const approveMetadata = {
  uiDescription: 'Approve a spender to spend tokens. Required before using tokens with DeFi protocols.',
  tags: ['wallet', 'token', 'defi'],
  requiredTools: [] as string[],
  packages: ['@tetherto/wdk-wallet-evm'],
  parameters: {
    chain: { type: 'string', description: 'EVM chain: ethereum, polygon, arbitrum', required: true },
    token: { type: 'string', description: 'Token symbol: USDT, USDC, etc.', required: true },
    spender: { type: 'string', description: 'Spender contract address', required: true },
    amount: { type: 'string', description: 'Amount to approve (e.g., "100")', required: true },
  },
};

export const approveTool = {
  type: 'function' as const,
  name: 'approve',
  description: "Approve token spending. Args: chain (ethereum/polygon/arbitrum), token (USDT, USDC), spender (address), amount",
  parameters: approveSchema,
  metadata: approveMetadata,
  execute: async ({ chain, token, spender, amount }: { chain: string; token: string; spender: string; amount: string }) => {
    try {
      const tokenInfo = getTokenInfo(chain, token);
      if (!tokenInfo) {
        return `Error: Token ${token} not found on ${chain}`;
      }
      if (tokenInfo.contractAddress === 'native') {
        return `Error: Native tokens don't need approval`;
      }

      const result = await wdkService.approve(
        chain as 'ethereum' | 'polygon' | 'arbitrum',
        tokenInfo.contractAddress,
        spender,
        amount,
        tokenInfo.decimals
      );

      return `Approval successful! Hash: ${result.hash}`;
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};
