import { z } from 'zod';
import { getQuote, SOLANA_TOKENS } from './jupiter';

export const solanaJupiterQuoteSwapSchema = z.object({
  tokenIn: z.string().describe('Token symbol to sell (e.g., SOL, USDC, USDT)'),
  tokenOut: z.string().describe('Token symbol to buy (e.g., USDC, SOL, USDT)'),
  amount: z.string().describe('Amount in human-readable units (e.g., "1.5")'),
});

export const solanaJupiterQuoteSwapMetadata = {
  uiDescription: 'Get a quote for a Jupiter swap on Solana. Shows expected output amount and price impact without executing the trade.',
  tags: ['swap', 'defi', 'jupiter', 'solana'],
  requiredTools: [] as string[],
  packages: [] as string[],
  parameters: {
    tokenIn: { type: 'string', description: 'Token to sell: SOL, USDC, USDT', required: true },
    tokenOut: { type: 'string', description: 'Token to buy: SOL, USDC, USDT', required: true },
    amount: { type: 'string', description: 'Amount to sell (e.g., "1.5")', required: true },
  },
};

// Token symbol to mint address mapping
const TOKEN_MINT_MAP: Record<string, string> = {
  SOL: SOLANA_TOKENS.SOL,
  USDC: SOLANA_TOKENS.USDC,
  USDT: SOLANA_TOKENS.USDT,
};

export const solanaJupiterQuoteSwapTool = {
  type: 'function' as const,
  name: 'solana_jupiter_quote_swap',
  description: "Get a Jupiter swap quote on Solana. Args: tokenIn (symbol to sell), tokenOut (symbol to buy), amount. Returns estimated output and price impact.",
  parameters: solanaJupiterQuoteSwapSchema,
  metadata: solanaJupiterQuoteSwapMetadata,
  execute: async ({ tokenIn, tokenOut, amount }: { 
    tokenIn: string; 
    tokenOut: string; 
    amount: string;
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
      
      // Get quote from Jupiter
      const quote = await getQuote(inputMint, outputMint, baseAmount, 50);
      
      // Format output
      const inputAmount = (BigInt(quote.inAmount) / BigInt(10 ** decimals)).toString();
      const outputAmount = (BigInt(quote.outAmount) / BigInt(10 ** decimals)).toString();
      
      return JSON.stringify({
        success: true,
        tokenIn,
        tokenOut,
        inputAmount,
        outputAmount,
        priceImpact: quote.priceImpactPct,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        isError: true, 
        message: `Quote failed: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};