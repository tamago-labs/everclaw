import { listTokens, TokenConfig } from '../tokens/storage';
import { wdkService } from '../wdk/WDKService';
import { getTokenImageUrl } from '../../utils/tokenImages';
import { getLastPrice } from '../pricing';

export interface TokenBalance {
  symbol: string;
  contractAddress: string;
  chain: string;
  decimals: number;
  isDefault: boolean;
  balance: string;
  balanceFormatted: string;
  value: string;
  price: number;
  imageUrl: string;
}

export interface BalanceResult {
  chain: string;
  nativeBalance: string;
  nativeBalanceFormatted: string;
  nativeValue: string;
  tokens: TokenBalance[];
}

function formatBalance(rawBalance: string, decimals: number): string {
  try {
    const balance = BigInt(rawBalance);
    const divisor = BigInt(10 ** decimals);
    const whole = balance / divisor;
    const fractional = balance % divisor;
    
    if (fractional === 0n) {
      return whole.toString();
    }
    
    const fractionalStr = fractional.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    return `${whole}.${trimmedFractional}`;
  } catch {
    return '0';
  }
}

async function calculateValue(balance: string, symbol: string): Promise<{ value: string; price: number }> {
  try {
    const num = parseFloat(balance);
    if (isNaN(num) || num === 0) return { value: '$0', price: 0 };
    const price = await getLastPrice(symbol);
    const value = num * price;
    return {
      value: `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      price,
    };
  } catch {
    return { value: '$0', price: 0 };
  }
}

export async function getNativeBalance(chain: string): Promise<{ balance: string; formatted: string }> {
  try {
    const balance = await wdkService.getBalance(chain as any);
    const decimals = chain === 'solana' ? 9 : chain === 'bitcoin' ? 8 : 18;
    const formatted = formatBalance(balance, decimals);
    return { balance, formatted };
  } catch (error) {
    console.error(`Failed to get native balance for ${chain}:`, error);
    return { balance: '0', formatted: '0' };
  }
}

export async function getTokenBalance(chain: string, tokenAddress: string, _decimals: number): Promise<string> {
  try {
    const account = await wdkService.getInstance().getAccount(chain, 0);
    const balance = await account.getTokenBalance(tokenAddress);
    return balance.toString();
  } catch (error) {
    console.error(`Failed to get token balance for ${tokenAddress} on ${chain}:`, error);
    return '0';
  }
}

export async function getAllBalances(): Promise<BalanceResult[]> {
  const tokens = listTokens();
  const results: BalanceResult[] = [];

  // Group tokens by chain
  const tokensByChain: Record<string, TokenConfig[]> = {};
  for (const token of tokens) {
    if (!tokensByChain[token.chain]) {
      tokensByChain[token.chain] = [];
    }
    tokensByChain[token.chain].push(token);
  }

  // Process each chain
  for (const [chain, chainTokens] of Object.entries(tokensByChain)) {
    // Get native balance and value
    const nativeSymbols: Record<string, string> = {
      ethereum: 'ETH',
      polygon: 'POL',
      arbitrum: 'ETH',
      solana: 'SOL',
      bitcoin: 'BTC',
    };
    const nativeSymbol = nativeSymbols[chain] || 'ETH';
    const { balance: nativeRaw, formatted: nativeFormatted } = await getNativeBalance(chain);
    const { value: nativeValue } = await calculateValue(nativeFormatted, nativeSymbol);

    // Get token balances
    const tokenBalances: TokenBalance[] = [];
    
    for (const token of chainTokens) {
      if (token.contractAddress === 'native') continue; // Skip native token in this loop
      
      const rawBalance = await getTokenBalance(chain, token.contractAddress, token.decimals);
      const formatted = formatBalance(rawBalance, token.decimals);
      const { value, price } = await calculateValue(formatted, token.symbol);
      
      tokenBalances.push({
        ...token,
        balance: rawBalance,
        balanceFormatted: formatted,
        value,
        price,
        imageUrl: getTokenImageUrl(token.symbol),
      });
    }

    results.push({
      chain,
      nativeBalance: nativeRaw,
      nativeBalanceFormatted: nativeFormatted,
      nativeValue,
      tokens: tokenBalances,
    });
  }

  return results;
}