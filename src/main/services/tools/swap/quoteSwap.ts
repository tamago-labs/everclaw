import { z } from 'zod';
import { wdkService } from '../../wdk/WDKService';
import { getTokenInfo } from '../../tokens/storage';

export const evmVeloraQuoteSwapSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'arbitrum']).describe('EVM chain to swap on'),
  tokenIn: z.string().describe('Token symbol to sell (e.g., USDT, USDC)'),
  tokenOut: z.string().describe('Token symbol to buy (e.g., USDC, USDT)'),
  amount: z.string().describe('Amount in human-readable units (e.g., "100")'),
  side: z.enum(['sell', 'buy']).optional().default('sell').describe('Whether amount is input (sell) or output (buy)'),
});

export const evmVeloraQuoteSwapMetadata = {
  uiDescription: 'Get a swap quote from Velora DEX on EVM chains (Ethereum, Polygon, Arbitrum). No transaction is executed - this is a read-only preview.',
  tags: ['swap', 'defi', 'ethereum', 'polygon', 'arbitrum'],
  requiredTools: [] as string[],
  packages: ['@tetherto/wdk-protocol-swap-velora-evm', '@tetherto/wdk-wallet-evm'],
  parameters: {
    chain: { type: 'string', description: 'EVM chain: ethereum, polygon, arbitrum', required: true },
    tokenIn: { type: 'string', description: 'Token to sell: USDT, USDC, ETH, etc.', required: true },
    tokenOut: { type: 'string', description: 'Token to buy: USDT, USDC, ETH, etc.', required: true },
    amount: { type: 'string', description: 'Amount to sell/buy (e.g., "100")', required: true },
    side: { type: 'string', description: 'sell (amount is input) or buy (amount is output), default: sell', required: false },
  },
};

export const evmVeloraQuoteSwapTool = {
  type: 'function' as const,
  name: 'evm_velora_quote_swap',
  description: "Get a swap quote from Velora DEX. Args: chain (ethereum/polygon/arbitrum), tokenIn (symbol to sell), tokenOut (symbol to buy), amount, side (sell/buy, default sell). Returns quote with expected output amount and fees.",
  parameters: evmVeloraQuoteSwapSchema,
  metadata: evmVeloraQuoteSwapMetadata,
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

      const result = await wdkService.quoteSwap(
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
        tokenIn,
        tokenOut,
        tokenInAmount,
        tokenOutAmount,
        fee: result.fee
      }, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        isError: true, 
        message: `Quote swap failed: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};