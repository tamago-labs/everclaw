import { ipcMain } from 'electron';

// @ts-ignore - Bitfinex client is ESM module
import { BitfinexPricingClient } from '@tetherto/wdk-pricing-bitfinex-http';
// @ts-ignore - Pricing provider is ESM module
import { PricingProvider } from '@tetherto/wdk-pricing-provider';

// Initialize the client
const client = new BitfinexPricingClient();

// Initialize pricing provider with cache
const pricingProvider = new PricingProvider({
  client,
  priceCacheDurationMs: 60 * 60 * 1000, // 1 hour cache
});

/**
 * Get the last price for a symbol in USD
 */
export async function getLastPrice(symbol: string): Promise<number> {
  try {
    // Stablecoins are always $1
    const stablecoins = ['USDC', 'USDT', 'DAI', 'USDD'];
    if (stablecoins.includes(symbol.toUpperCase())) {
      return 1.0;
    }
    
    const price = await pricingProvider.getLastPrice(symbol, 'USD');
    return price || 0;
  } catch (error) {
    console.error(`Failed to get price for ${symbol}:`, error);
    return 0;
  }
}

/**
 * Get prices for multiple symbols
 */
export async function getPrices(symbols: string[]): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  
  for (const symbol of symbols) {
    results[symbol] = await getLastPrice(symbol);
  }
  
  return results;
}

/**
 * Register pricing IPC handlers
 */
export function registerPricingHandlers(): void {
  ipcMain.handle('pricing:getLastPrice', async (_event, symbol: string) => {
    try {
      return await getLastPrice(symbol);
    } catch (error) {
      console.error('Failed to get price:', error);
      return 0;
    }
  });

  ipcMain.handle('pricing:getPrices', async (_event, symbols: string[]) => {
    try {
      return await getPrices(symbols);
    } catch (error) {
      console.error('Failed to get prices:', error);
      return {};
    }
  });

  console.log('Pricing IPC handlers registered');
}
