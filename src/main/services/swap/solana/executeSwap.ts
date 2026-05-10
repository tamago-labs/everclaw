import { z } from 'zod';
import { executeSwap as jupiterExecuteSwap, getQuote, SOLANA_TOKENS } from './jupiter';

export const solanaJupiterExecuteSwapSchema = z.object({
  tokenIn: z.string().describe('Token symbol to sell (e.g., SOL, USDC, USDT)'),
  tokenOut: z.string().describe('Token symbol to buy (e.g., USDC, SOL, USDT)'),
  amount: z.string().describe('Amount in human-readable units (e.g., "1.5")'),
  slippage: z.number().optional().default(0.5).describe('Slippage tolerance percentage'),
});

export const solanaJupiterExecuteSwapMetadata = {
  uiDescription: 'Execute a token swap via Jupiter DEX on Solana. This broadcasts a real transaction - ensure you have sufficient balance and the quote looks correct.',
  tags: ['swap', 'defi', 'jupiter', 'solana'],
  requiredTools: [] as string[],
  packages: [] as string[],
  parameters: {
    tokenIn: { type: 'string', description: 'Token to sell: SOL, USDC, USDT', required: true },
    tokenOut: { type: 'string', description: 'Token to buy: SOL, USDC, USDT', required: true },
    amount: { type: 'string', description: 'Amount to sell (e.g., "1.5")', required: true },
    slippage: { type: 'number', description: 'Slippage tolerance % (default: 0.5)', required: false },
  },
};

// Token symbol to mint address mapping
const TOKEN_MINT_MAP: Record<string, string> = {
  SOL: SOLANA_TOKENS.SOL,
  USDC: SOLANA_TOKENS.USDC,
  USDT: SOLANA_TOKENS.USDT,
};

export const solanaJupiterExecuteSwapTool = {
  type: 'function' as const,
  name: 'solana_jupiter_execute_swap',
  description: "Execute a Jupiter swap on Solana. Args: tokenIn (symbol to sell), tokenOut (symbol to buy), amount. This broadcasts a transaction.",
  parameters: solanaJupiterExecuteSwapSchema,
  metadata: solanaJupiterExecuteSwapMetadata,
  execute: async ({ tokenIn, tokenOut, amount, slippage }: { 
    tokenIn: string; 
    tokenOut: string; 
    amount: string;
    slippage?: number;
  }) => {
    try {
      // Resolve token symbols to mint addresses
      const inputMint = TOKEN_MINT_MAP[tokenIn.toUpperCase()];
      const outputMint = TOKEN_MINT_MAP[tokenOut.toUpperCase()];
      
      if (!inputMint) {
        return JSON.stringify({ isError: true, message: `Unknown token: ${tokenIn}` });
      }
      if (!outputMint) {
        return JSON.stringify({ isError: true, message: `Unknown token: ${tokenOut}` });
      }
      
      // Get decimals based on token
      const decimals = inputMint === SOLANA_TOKENS.SOL ? 9 : 6;
      
      // Convert amount to base units
      const baseAmount = (BigInt(Math.floor(parseFloat(amount) * 10 ** decimals))).toString();
      
      // Slippage in basis points
      const slippageBps = Math.floor((slippage ?? 0.5) * 100);
      
      // First get a quote to show expected amounts
      const quote = await getQuote(inputMint, outputMint, baseAmount, slippageBps);
      
      // Execute the swap
      const result = await jupiterExecuteSwap(inputMint, outputMint, baseAmount, slippageBps);
      
      if (!result.success) {
        return JSON.stringify({ isError: true, message: result.error || 'Swap failed' });
      }
      
      // Format amounts
      const inputAmount = (BigInt(quote.inAmount) / BigInt(10 ** decimals)).toString();
      const outputAmount = (BigInt(quote.outAmount) / BigInt(10 ** decimals)).toString();
      
      return JSON.stringify({
        success: true,
        transactionHash: result.transactionHash,
        tokenIn,
        tokenOut,
        inputAmount,
        outputAmount,
        fee: result.transactionHash ? '0.000005' : '0', // ~5000 lamports in SOL
      }, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        isError: true, 
        message: `Swap execution failed: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};