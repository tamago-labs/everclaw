import { z } from 'zod';
import { getOwnedLSTs } from '../../solana/sanctum/api';
import { wdkService } from '../../wdk/WDKService';

export const sanctumGetOwnedLSTsSchema = z.object({});

export const sanctumGetOwnedLSTsMetadata = {
  uiDescription: 'Get all LST tokens owned by the wallet on Sanctum.',
  tags: [ 'staking',  'defi', 'solana'],
  requiredTools: [] as string[],
  packages: [] as string[],
  parameters: {},
};

export const sanctumGetOwnedLSTsTool = {
  type: 'function' as const,
  name: 'sanctum_get_owned_lst',
  description: "Get all LST tokens owned by the wallet on Sanctum.",
  parameters: sanctumGetOwnedLSTsSchema,
  metadata: sanctumGetOwnedLSTsMetadata,
  execute: async () => {
    try {
      const walletAddress = await wdkService.getAddress('solana');
      const ownedLSTs = await getOwnedLSTs(walletAddress);
      
      return JSON.stringify({
        success: true,
        wallet: walletAddress,
        lsts: ownedLSTs,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        isError: true, 
        message: `Failed to get owned LSTs: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};