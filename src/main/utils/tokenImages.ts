// Token image URL mapping
export const TOKEN_IMAGES: Record<string, string> = {
  ETH: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  WETH: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  POL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28321.png',
  SOL: 'https://icons.llamao.fi/icons/chains/rsz_solana?w=48&h=48',
  BTC: 'https://assets.coingecko.com/coins/images/1/standard/bitcoin.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/standard/USDC.png',
  USDS: 'https://assets.coingecko.com/coins/images/39926/standard/usds.webp',
  LINK: 'https://assets.coingecko.com/coins/images/877/standard/Chainlink_Logo_500.png',
  USDE: 'https://assets.coingecko.com/coins/images/33613/standard/usde.png',
  PENGU: 'https://assets.coingecko.com/coins/images/52622/standard/PUDGY_PENGUINS_PENGU_PFP.png',
  PEPE: 'https://assets.coingecko.com/coins/images/29850/standard/pepe-token.jpeg',
  SIREN: 'https://assets.coingecko.com/coins/images/54479/standard/siren.png',
  PUMP: 'https://assets.coingecko.com/coins/images/67164/standard/pump.jpg',
  BONK: 'https://assets.coingecko.com/coins/images/28600/standard/bonk.jpg',
  TRUMP: 'https://assets.coingecko.com/coins/images/53746/standard/trump.png',
};

// Default image for unknown tokens
const DEFAULT_IMAGE = 'https://assets.coingecko.com/coins/images/1/standard/bitcoin.png';

/**
 * Get token image URL by symbol
 */
export function getTokenImageUrl(symbol: string): string {
  return TOKEN_IMAGES[symbol.toUpperCase()] || DEFAULT_IMAGE;
}

/**
 * Get multiple token image URLs
 */
export function getTokenImageUrls(symbols: string[]): string[] {
  return symbols.map(symbol => getTokenImageUrl(symbol));
}