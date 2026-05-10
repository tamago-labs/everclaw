import { z } from 'zod';
import { getLSTAPY, getLSTPrice, getLSTTVL } from '../../solana/sanctum/api';
import { SANCTUM_LST_MINTS } from '../../solana/sanctum/constants';

export const sanctumGetLSTInfoSchema = z.object({
  lst: z.string().describe('LST symbol (e.g., SOL, BSOL, LST)'),
});

export const sanctumGetLSTInfoMetadata = {
  uiDescription: 'Get APY, price, and TVL for a LST token on Sanctum.',
  tags: ['staking',  'defi', 'solana'],
  requiredTools: [] as string[],
  packages: [] as string[],
  parameters: {
    lst: { type: 'string', description: 'LST symbol: SOL, BSOL, LST, JitoSOL, Marinade', required: true },
  },
};

// Get LST mint address
function getLSTMint(symbol: string): string | undefined {
  return SANCTUM_LST_MINTS[symbol.toUpperCase() as keyof typeof SANCTUM_LST_MINTS];
}

export const sanctumGetLSTInfoTool = {
  type: 'function' as const,
  name: 'sanctum_get_lst_info',
  description: "Get APY, price, and TVL for a LST token on Sanctum. Args: lst (symbol).",
  parameters: sanctumGetLSTInfoSchema,
  metadata: sanctumGetLSTInfoMetadata,
  execute: async ({ lst }: { lst: string }) => {
    try {
      const mint = getLSTMint(lst);
      if (!mint) {
        return JSON.stringify({ isError: true, message: `Unknown LST: ${lst}. Available: ${Object.keys(SANCTUM_LST_MINTS).join(', ')}` });
      }
      
      // Fetch all data in parallel
      const [apy, price, tvl] = await Promise.all([
        getLSTAPY(mint),
        getLSTPrice(mint),
        getLSTTVL(mint),
      ]);
      
      return JSON.stringify({
        success: true,
        lst,
        apy: (apy * 100).toFixed(2) + '%',
        price: price.toFixed(4) + ' SOL',
        tvl: tvl.toLocaleString() + ' SOL',
      }, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        isError: true, 
        message: `Failed to get LST info: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};