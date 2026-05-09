import { z } from 'zod';
import { wdkService } from '../../wdk/WDKService';

export const getAddressSchema = z.object({
  chain: z.enum(['ethereum', 'polygon', 'arbitrum', 'solana', 'bitcoin']).optional().describe('Blockchain network'),
});

// Tool metadata for UI
export const getAddressMetadata = {
  uiDescription: 'Get the user\'s wallet address on blockchain networks. If no chain is specified, returns addresses for all supported chains.',
  tags: ['wallet', 'ethereum', 'polygon', 'arbitrum', 'solana', 'bitcoin'],
  requiredTools: [] as string[],
  packages: ['@tetherto/wdk-wallet-evm', '@tetherto/wdk-wallet-solana', '@tetherto/wdk-wallet-btc'],
  parameters: {
    chain: { type: 'string', description: 'Blockchain network (optional): ethereum, polygon, arbitrum, solana, bitcoin', required: false },
  },
};

export const getAddressTool = {
  type: 'function' as const,
  name: 'get_address',
  description: "Get the user's wallet address on blockchain networks. Supported chains: ethereum, polygon, arbitrum, solana, bitcoin (optional, returns all if not specified)",
  parameters: getAddressSchema,
  metadata: getAddressMetadata,
  execute: async ({ chain }: { chain?: string }) => {
    try {
      // If specific chain requested
      if (chain) {
        const address = await wdkService.getAddress(chain as any);
        return `${chain}: ${address}`;
      }
      
      // Otherwise return all addresses
      const accounts = await wdkService.getAccounts();
      const addresses = accounts.map(acc => `${acc.chain}: ${acc.address}`).join(', ');
      return addresses;
    } catch (error) {
      return `Error getting address: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};
