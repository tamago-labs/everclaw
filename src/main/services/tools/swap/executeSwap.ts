import { z } from 'zod';
import { wdkService } from '../../wdk/WDKService';
import { getTokenInfo } from '../../tokens/storage';

export const evmVeloraExecuteSwapSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'arbitrum']).describe('EVM chain to swap on'),
  tokenIn: z.string().describe('Token symbol to sell (e.g., USDT, USDC)'),
  tokenOut: z.string().describe('Token symbol to buy (e.g., USDC, USDT)'),
  amount: z.string().describe('Amount in human-readable units (e.g., "100")'),
  slippage: z.number().optional().default(0.5).describe('Slippage tolerance percentage'),
});

export const evmVeloraExecuteSwapMetadata = {
  uiDescription: 'Execute a token swap via Velora DEX on EVM chains. This broadcasts a real transaction - ensure you have sufficient balance and the quote looks correct.',
  tags: ['swap', 'defi',  'ethereum', 'polygon', 'arbitrum'],
  requiredTools: [] as string[],
  packages: ['@tetherto/wdk-protocol-swap-velora-evm', '@tetherto/wdk-wallet-evm'],
  parameters: {
    chain: { type: 'string', description: 'EVM chain: ethereum, polygon, arbitrum', required: true },
    tokenIn: { type: 'string', description: 'Token to sell: USDT, USDC, ETH, etc.', required: true },
    tokenOut: { type: 'string', description: 'Token to buy: USDT, USDC, ETH, etc.', required: true },
    amount: { type: 'string', description: 'Amount to sell (e.g., "100")', required: true },
    slippage: { type: 'number', description: 'Slippage tolerance % (default: 0.5)', required: false },
  },
};

export const evmVeloraExecuteSwapTool = {
  type: 'function' as const,
  name: 'evm_velora_execute_swap',
  description: "Execute a token swap via Velora DEX. Args: chain (ethereum/polygon/arbitrum), tokenIn (symbol to sell), tokenOut (symbol to buy), amount. This broadcasts a transaction.",
  parameters: evmVeloraExecuteSwapSchema,
  metadata: evmVeloraExecuteSwapMetadata,
  execute: async ({ chain, tokenIn, tokenOut, amount }: { 
    chain: string; 
    tokenIn: string; 
    tokenOut: string; 
    amount: string;
  }) => {
    try {
      const tokenInInfo = getTokenInfo(chain, tokenIn);
      if (!tokenInInfo) {
        return JSON.stringify({ isError: true, message: `Token ${tokenIn} not found on ${chain}` });
      }

      const tokenOutInfo = getTokenInfo(chain, tokenOut);
      if (!tokenOutInfo) {
        return JSON.stringify({ isError: true, message: `Token ${tokenOut} not found on ${chain}` });
      }

      // Handle native token addresses
      const tokenInAddress = tokenInInfo.contractAddress === 'native' ? 'native' : tokenInInfo.contractAddress;
      const tokenOutAddress = tokenOutInfo.contractAddress === 'native' ? 'native' : tokenOutInfo.contractAddress;

      const result = await wdkService.executeSwap(
        chain as 'ethereum' | 'polygon' | 'arbitrum',
        tokenInAddress,
        tokenOutAddress,
        amount,
        tokenInInfo.decimals
      );

      // Format amounts for readability
      const tokenInAmount = (BigInt(result.tokenInAmount) / BigInt(10 ** tokenInInfo.decimals)).toString();
      const tokenOutAmount = (BigInt(result.tokenOutAmount) / BigInt(10 ** tokenOutInfo.decimals)).toString();

      return JSON.stringify({
        success: true,
        transactionHash: result.hash,
        tokenIn,
        tokenOut,
        tokenInAmount,
        tokenOutAmount,
        fee: result.fee
      }, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        isError: true, 
        message: `Swap execution failed: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};