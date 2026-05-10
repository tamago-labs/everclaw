import { z } from 'zod';
import { executeSwap as jupiterExecuteSwap, getQuote, SOLANA_TOKENS } from './jupiter';
import { listTokens } from '../../tokens/storage';

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
      
      // Slippage in basis points
      const slippageBps = Math.floor((slippage ?? 0.5) * 100);
      
      // First get a quote to show expected amounts
      const quote = await getQuote(inputToken.mint, outputToken.mint, baseAmount, slippageBps);
      
      // Execute the swap
      const result = await jupiterExecuteSwap(inputToken.mint, outputToken.mint, baseAmount, slippageBps);
      
      if (!result.success) {
        return JSON.stringify({ isError: true, message: result.error || 'Swap failed' });
      }
      
      // Format amounts - use CORRECT decimals for EACH token
      const formattedInputAmount = (BigInt(quote.inAmount) / BigInt(10 ** inputToken.decimals)).toString();
      const formattedOutputAmount = (BigInt(quote.outAmount) / BigInt(10 ** outputToken.decimals)).toString();
      
      return JSON.stringify({
        success: true,
        transactionHash: result.transactionHash,
        tokenIn,
        tokenOut,
        inputAmount: formattedInputAmount,
        outputAmount: formattedOutputAmount,
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
