import { z } from 'zod';
import { wdkService } from '../../wdk/WDKService';
import { getLuloDepositTransaction } from '../../solana/lulo/api';
import { executeLuloTransaction } from '../../solana/lulo/execute';
import { LULO_NATIVE_SOL } from '../../solana/lulo/constants';
import { getTokenInfo } from '../../tokens/storage';

export const luloQuoteSupplySchema = z.object({
  token: z.string().describe('Token to supply (symbol)'),
  amount: z.string().describe('Amount in human-readable units'),
});

export const luloQuoteSupplyMetadata = {
  uiDescription: 'Preview supply to Lulo lending before executing.',
  tags: ['lending', 'lulo', 'solana'],
  requiredTools: [] as string[],
  packages: [] as string[],
  parameters: {
    token: { type: 'string', description: 'Token symbol (e.g., USDC, SOL)', required: true },
    amount: { type: 'string', description: 'Amount to supply (e.g., "100")', required: true },
  },
};

// Get token mint address from token registry
function getTokenMint(symbol: string): { mint: string; decimals: number } | undefined {
  const tokenInfo = getTokenInfo('solana', symbol);
  if (!tokenInfo) return undefined;
  
  // For SOL, use native address
  const mint = tokenInfo.symbol === 'SOL' ? LULO_NATIVE_SOL : tokenInfo.contractAddress;
  return { mint, decimals: tokenInfo.decimals };
}

export const luloQuoteSupplyTool = {
  type: 'function' as const,
  name: 'lulo_quote_supply',
  description: "Preview supply to Lulo lending. Args: token (symbol), amount.",
  parameters: luloQuoteSupplySchema,
  metadata: luloQuoteSupplyMetadata,
  execute: async ({ token, amount }: { token: string; amount: string }) => {
    try {
      const tokenData = getTokenMint(token);
      if (!tokenData) {
        return JSON.stringify({ isError: true, message: `Unknown token: ${token}` });
      }
      
      return JSON.stringify({
        success: true,
        token,
        amount,
        note: 'Supply to Lulo for yield. Use lulo_supply to execute.',
      }, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        isError: true, 
        message: `Quote failed: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};

// Execute supply
export const luloExecuteSupplySchema = z.object({
  token: z.string().describe('Token to supply (USDC, SOL)'),
  amount: z.string().describe('Amount in human-readable units'),
});

export const luloExecuteSupplyMetadata = {
  uiDescription: 'Supply tokens to Lulo lending. Broadcasts a real transaction.',
  tags: ['lending', 'lulo', 'solana'],
  requiredTools: [] as string[],
  packages: [] as string[],
  parameters: {
    token: { type: 'string', description: 'Token: USDC, SOL', required: true },
    amount: { type: 'string', description: 'Amount to supply (e.g., "100")', required: true },
  },
};

export const luloExecuteSupplyTool = {
  type: 'function' as const,
  name: 'lulo_supply',
  description: "Supply tokens to Lulo lending. Args: token (symbol), amount. This broadcasts a transaction.",
  parameters: luloExecuteSupplySchema,
  metadata: luloExecuteSupplyMetadata,
  execute: async ({ token, amount }: { token: string; amount: string }) => {
    try {
      const tokenData = getTokenMint(token);
      if (!tokenData) {
        return JSON.stringify({ isError: true, message: `Unknown token: ${token}` });
      }
      
      const walletAddress = await wdkService.getAddress('solana');
      const baseAmount = (BigInt(Math.floor(parseFloat(amount) * 10 ** tokenData.decimals))).toString();
      
      // Get deposit transaction from Lulo API
      const transactionBase64 = await getLuloDepositTransaction(tokenData.mint, baseAmount, walletAddress);
      
      // Execute the transaction
      const result = await executeLuloTransaction(transactionBase64);
      
      return JSON.stringify({
        success: true,
        transactionHash: result.signature,
        token,
        amount,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        isError: true, 
        message: `Supply failed: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};
