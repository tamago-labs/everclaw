import { z } from 'zod';
import { wdkService } from '../../wdk/WDKService';
import { getLuloWithdrawTransaction } from '../../solana/lulo/api';
import { executeLuloTransaction } from '../../solana/lulo/execute';
import { LULO_NATIVE_SOL } from '../../solana/lulo/constants';
import { getTokenInfo } from '../../tokens/storage';

export const luloQuoteWithdrawSchema = z.object({
  token: z.string().describe('Token to withdraw (symbol)'),
  amount: z.string().describe('Amount in human-readable units'),
});

export const luloQuoteWithdrawMetadata = {
  uiDescription: 'Preview withdraw from Lulo lending before executing.',
  tags: ['lending',  'defi', 'solana'],
  requiredTools: [] as string[],
  packages: [] as string[],
  parameters: {
    token: { type: 'string', description: 'Token symbol (e.g., USDC, SOL)', required: true },
    amount: { type: 'string', description: 'Amount to withdraw (e.g., "100")', required: true },
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

export const luloQuoteWithdrawTool = {
  type: 'function' as const,
  name: 'lulo_quote_withdraw',
  description: "Preview withdraw from Lulo lending. Args: token (symbol), amount.",
  parameters: luloQuoteWithdrawSchema,
  metadata: luloQuoteWithdrawMetadata,
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
        note: 'Withdraw from Lulo lending. Use lulo_withdraw to execute.',
      }, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        isError: true, 
        message: `Quote failed: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};

// Execute withdraw
export const luloExecuteWithdrawSchema = z.object({
  token: z.string().describe('Token to withdraw (symbol)'),
  amount: z.string().describe('Amount in human-readable units'),
});

export const luloExecuteWithdrawMetadata = {
  uiDescription: 'Withdraw tokens from Lulo lending. Broadcasts a real transaction.',
  tags: ['lending','defi', 'solana'],
  requiredTools: [] as string[],
  packages: [] as string[],
  parameters: {
    token: { type: 'string', description: 'Token symbol (e.g., USDC, SOL)', required: true },
    amount: { type: 'string', description: 'Amount to withdraw (e.g., "100")', required: true },
  },
};

export const luloExecuteWithdrawTool = {
  type: 'function' as const,
  name: 'lulo_withdraw',
  description: "Withdraw tokens from Lulo lending. Args: token (symbol), amount. This broadcasts a transaction.",
  parameters: luloExecuteWithdrawSchema,
  metadata: luloExecuteWithdrawMetadata,
  execute: async ({ token, amount }: { token: string; amount: string }) => {
    try {
      const tokenData = getTokenMint(token);
      if (!tokenData) {
        return JSON.stringify({ isError: true, message: `Unknown token: ${token}` });
      }
      
      const walletAddress = await wdkService.getAddress('solana');
      const baseAmount = (BigInt(Math.floor(parseFloat(amount) * 10 ** tokenData.decimals))).toString();
      
      // Get withdraw transaction from Lulo API
      const transactionBase64 = await getLuloWithdrawTransaction(tokenData.mint, baseAmount, walletAddress);
      
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
        message: `Withdraw failed: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};