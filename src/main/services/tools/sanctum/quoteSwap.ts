import { z } from 'zod';
import { getLSTQuote } from '../../solana/sanctum/api';
import { SANCTUM_LST_MINTS } from '../../solana/sanctum/constants';

export const sanctumQuoteSwapSchema = z.object({
  lstIn: z.string().describe('LST symbol to sell (e.g., SOL, BSOL, LST)'),
  lstOut: z.string().describe('LST symbol to buy (e.g., BSOL, LST, SOL)'),
  amount: z.string().describe('Amount in human-readable units (e.g., "1.5")'),
});

export const sanctumQuoteSwapMetadata = {
  uiDescription: 'Get a quote for swapping between LST tokens on Sanctum. Shows expected output amount and price impact.',
  tags: ['staking',  'defi', 'solana'],
  requiredTools: [] as string[],
  packages: [] as string[],
  parameters: {
    lstIn: { type: 'string', description: 'LST to sell: SOL, BSOL, LST, JitoSOL, Marinade', required: true },
    lstOut: { type: 'string', description: 'LST to buy: SOL, BSOL, LST, JitoSOL, Marinade', required: true },
    amount: { type: 'string', description: 'Amount to sell (e.g., "1.5")', required: true },
  },
};

// Get LST mint address
function getLSTMint(symbol: string): string | undefined {
  return SANCTUM_LST_MINTS[symbol.toUpperCase() as keyof typeof SANCTUM_LST_MINTS];
}

export const sanctumQuoteSwapTool = {
  type: 'function' as const,
  name: 'sanctum_quote_swap',
  description: "Get a quote for swapping LST tokens on Sanctum. Args: lstIn (symbol to sell), lstOut (symbol to buy), amount.",
  parameters: sanctumQuoteSwapSchema,
  metadata: sanctumQuoteSwapMetadata,
  execute: async ({ lstIn, lstOut, amount }: { 
    lstIn: string; 
    lstOut: string; 
    amount: string;
  }) => {
    try {
      const inputMint = getLSTMint(lstIn);
      const outputMint = getLSTMint(lstOut);
      
      if (!inputMint) {
        return JSON.stringify({ isError: true, message: `Unknown LST: ${lstIn}. Available: ${Object.keys(SANCTUM_LST_MINTS).join(', ')}` });
      }
      if (!outputMint) {
        return JSON.stringify({ isError: true, message: `Unknown LST: ${lstOut}. Available: ${Object.keys(SANCTUM_LST_MINTS).join(', ')}` });
      }
      
      // Convert amount to base units (LSTs use 9 decimals)
      const baseAmount = (BigInt(Math.floor(parseFloat(amount) * 1e9))).toString();
      
      // Get quote from Sanctum
      const quote = await getLSTQuote(inputMint, outputMint, baseAmount);
      
      // Format amounts
      const inputAmount = (BigInt(quote.inAmount) / BigInt(1e9)).toString();
      const outputAmount = (BigInt(quote.outAmount) / BigInt(1e9)).toString();
      
      return JSON.stringify({
        success: true,
        lstIn,
        lstOut,
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