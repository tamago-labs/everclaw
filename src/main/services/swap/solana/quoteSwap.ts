import { z } from 'zod';
import { getQuote, SOLANA_TOKENS } from './jupiter';
import { listTokens } from '../../tokens/storage';

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

// Build token mint map from storage (except SOL which is always native)
function buildSolanaTokenMintMap(): Record<string, { mint: string; decimals: number }> {
  const tokens = listTokens();
  const tokenMap: Record<string, { mint: string; decimals: number }> = {};
  
  // SOL is always native
  tokenMap['SOL'] = { mint: SOLANA_TOKENS.SOL, decimals: 9 };
  
  // Add all other Solana tokens from storage
  for (const token of tokens) {
    if (token.chain === 'solana' && token.symbol !== 'SOL') {
      tokenMap[token.symbol] = { 
        mint: token.contractAddress, 
        decimals: token.decimals 
      };
    }
  }
  
  return tokenMap;
}

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
      // Build token map from storage
      const tokenMap = buildSolanaTokenMintMap();
      const upperTokenIn = tokenIn.toUpperCase();
      const upperTokenOut = tokenOut.toUpperCase();
      
      // Resolve token symbols to mint addresses
      const inputToken = tokenMap[upperTokenIn];
      const outputToken = tokenMap[upperTokenOut];
      
      if (!inputToken) {
        return JSON.stringify({ isError: true, message: `Unknown token: ${tokenIn}` });
      }
      if (!outputToken) {
        return JSON.stringify({ isError: true, message: `Unknown token: ${tokenOut}` });
      }
      
      // Convert amount to base units (using input token decimals)
      const baseAmount = (BigInt(Math.floor(parseFloat(amount) * 10 ** inputToken.decimals))).toString();
      
      // Get quote from Jupiter
      const quote = await getQuote(inputToken.mint, outputToken.mint, baseAmount, 50);
      
      // Format output - use CORRECT decimals for EACH token
      const formattedInputAmount = (BigInt(quote.inAmount) / BigInt(10 ** inputToken.decimals)).toString();
      const formattedOutputAmount = (BigInt(quote.outAmount) / BigInt(10 ** outputToken.decimals)).toString();
      
      return JSON.stringify({
        success: true,
        tokenIn,
        tokenOut,
        inputAmount: formattedInputAmount,
        outputAmount: formattedOutputAmount,
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
