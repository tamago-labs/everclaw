import { z } from 'zod';
import { wdkService } from '../../wdk/WDKService';
import { getLSTQuote, getSwapTransaction } from '../../solana/sanctum/api';
import { executeSanctumSwap } from '../../solana/sanctum/executeSwap';
import { SANCTUM_LST_MINTS } from '../../solana/sanctum/constants';

export const sanctumExecuteSwapSchema = z.object({
  lstIn: z.string().describe('LST symbol to sell (e.g., SOL, BSOL, LST)'),
  lstOut: z.string().describe('LST symbol to buy (e.g., BSOL, LST, SOL)'),
  amount: z.string().describe('Amount in human-readable units (e.g., "1.5")'),
  slippage: z.number().optional().default(0.5).describe('Slippage tolerance percentage'),
});

export const sanctumExecuteSwapMetadata = {
  uiDescription: 'Execute a LST swap on Sanctum. Broadcasts a real transaction.',
  tags: [ 'staking',  'defi', 'solana'],
  requiredTools: [] as string[],
  packages: [] as string[],
  parameters: {
    lstIn: { type: 'string', description: 'LST to sell: SOL, BSOL, LST, JitoSOL, Marinade', required: true },
    lstOut: { type: 'string', description: 'LST to buy: SOL, BSOL, LST, JitoSOL, Marinade', required: true },
    amount: { type: 'string', description: 'Amount to sell (e.g., "1.5")', required: true },
    slippage: { type: 'number', description: 'Slippage tolerance % (default: 0.5)', required: false },
  },
};

// Get LST mint address
function getLSTMint(symbol: string): string | undefined {
  return SANCTUM_LST_MINTS[symbol.toUpperCase() as keyof typeof SANCTUM_LST_MINTS];
}

export const sanctumExecuteSwapTool = {
  type: 'function' as const,
  name: 'sanctum_execute_swap',
  description: "Execute a LST swap on Sanctum. Args: lstIn, lstOut, amount. This broadcasts a transaction.",
  parameters: sanctumExecuteSwapSchema,
  metadata: sanctumExecuteSwapMetadata,
  execute: async ({ lstIn, lstOut, amount, slippage }: { 
    lstIn: string; 
    lstOut: string; 
    amount: string;
    slippage?: number;
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
      
      const walletAddress = await wdkService.getAddress('solana');
      
      // Convert amount to base units
      const baseAmount = (BigInt(Math.floor(parseFloat(amount) * 1e9))).toString();
      const slippageBps = Math.floor((slippage ?? 0.5) * 100);
      
      // Get quote
      const quote = await getLSTQuote(inputMint, outputMint, baseAmount, slippageBps);
      
      // Get swap transaction
      const transactionBase64 = await getSwapTransaction(
        inputMint,
        outputMint,
        baseAmount,
        quote.outAmount,
        walletAddress
      );
      
      // Execute the swap
      const result = await executeSanctumSwap(transactionBase64);
      
      return JSON.stringify({
        success: true,
        transactionHash: result.signature,
        lstIn,
        lstOut,
        inputAmount: amount,
        outputAmount: (BigInt(quote.outAmount) / BigInt(1e9)).toString(),
      }, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        isError: true, 
        message: `Swap failed: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};