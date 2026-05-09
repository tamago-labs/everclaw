import { z } from 'zod';
import { getLastPrice } from '../pricing';

export const getPriceSchema = z.object({
  symbol: z.string().describe('Token symbol like BTC, ETH, SOL'),
});

// Tool metadata for UI
export const getPriceMetadata = {
  uiDescription: 'Get the current USD price for a cryptocurrency token. Supports major tokens like BTC, ETH, SOL, and more. Returns the price in USD.',
  tags: ['crypto', 'price', 'market', 'api'],
  requiredTools: [] as string[],
  parameters: {
    symbol: { type: 'string', description: 'Token symbol (required): BTC, ETH, SOL, etc.', required: true },
  },
};

export const getPriceTool = {
  type: 'function' as const,
  name: 'get_price',
  description: "Get the current USD price for a cryptocurrency token. Example symbols: BTC, ETH, SOL, MATIC, SHIB",
  parameters: getPriceSchema,
  metadata: getPriceMetadata,
  execute: async ({ symbol }: { symbol: string }) => {
    try {
      const price = await getLastPrice(symbol.toUpperCase());
      
      if (price === 0) {
        return `Price not found for ${symbol.toUpperCase()}`;
      }
      
      return `${symbol.toUpperCase()} price: $${price.toLocaleString()}`;
    } catch (error) {
      return `Error getting price: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};