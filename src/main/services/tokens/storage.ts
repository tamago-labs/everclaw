import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const TOKENS_DIR = 'tokens';
const TOKENS_FILE = 'tokens.json';

export interface TokenConfig {
  symbol: string;
  contractAddress: string;
  chain: string;
  decimals: number;
  isDefault: boolean;
}

export interface TokensData {
  [chain: string]: TokenConfig[];
}

// Default tokens with correct contract addresses and decimals
export const DEFAULT_TOKENS: TokenConfig[] = [
  // Solana
  { symbol: 'SOL', contractAddress: 'native', chain: 'solana', decimals: 9, isDefault: true },
  { symbol: 'USDT', contractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', chain: 'solana', decimals: 6, isDefault: true },
  { symbol: 'USDC', contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', chain: 'solana', decimals: 6, isDefault: true },
  // Ethereum
  { symbol: 'ETH', contractAddress: 'native', chain: 'ethereum', decimals: 18, isDefault: true }, 
  { symbol: 'USDT', contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7', chain: 'ethereum', decimals: 6, isDefault: true },
  { symbol: 'USDC', contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', chain: 'ethereum', decimals: 6, isDefault: true },
  // Polygon
  { symbol: 'POL', contractAddress: 'native', chain: 'polygon', decimals: 18, isDefault: true },
  { symbol: 'USDC', contractAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', chain: 'polygon', decimals: 6, isDefault: true },
  { symbol: 'USDT', contractAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', chain: 'polygon', decimals: 6, isDefault: true },
  // Arbitrum
  { symbol: 'ETH', contractAddress: 'native', chain: 'arbitrum', decimals: 18, isDefault: true },
  { symbol: 'USDT', contractAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', chain: 'arbitrum', decimals: 6, isDefault: true },
  { symbol: 'USDC', contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', chain: 'arbitrum', decimals: 6, isDefault: true },
  // Bitcoin
  { symbol: 'BTC', contractAddress: 'native', chain: 'bitcoin', decimals: 8, isDefault: true },
];

function getTokensPath(): string {
  return path.join(app.getPath('userData'), TOKENS_DIR);
}

function getTokensFilePath(): string {
  return path.join(getTokensPath(), TOKENS_FILE);
}

function ensureTokensDir(): void {
  const tokensPath = getTokensPath();
  if (!fs.existsSync(tokensPath)) {
    fs.mkdirSync(tokensPath, { recursive: true });
  }
}

export function getCustomTokens(): TokensData {
  ensureTokensDir();
  
  const filePath = getTokensFilePath();
  
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read tokens file:', error);
    return {};
  }
}

export function saveCustomTokens(tokens: TokensData): void {
  ensureTokensDir();
  
  const filePath = getTokensFilePath();
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('Failed to save tokens file:', error);
    throw error;
  }
}

export function addCustomToken(chain: string, token: TokenConfig): void {
  const tokens = getCustomTokens();
  
  if (!tokens[chain]) {
    tokens[chain] = [];
  }
  
  // Check if token already exists
  const exists = tokens[chain].some(t => t.symbol === token.symbol && t.contractAddress === token.contractAddress);
  if (exists) {
    return;
  }
  
  tokens[chain].push(token);
  saveCustomTokens(tokens);
}

export function removeCustomToken(chain: string, symbol: string): boolean {
  const tokens = getCustomTokens();
  
  if (!tokens[chain]) {
    return false;
  }
  
  const index = tokens[chain].findIndex(t => t.symbol === symbol && !t.isDefault);
  if (index === -1) {
    return false;
  }
  
  tokens[chain].splice(index, 1);
  
  // Clean up empty chains
  if (tokens[chain].length === 0) {
    delete tokens[chain];
  }
  
  saveCustomTokens(tokens);
  return true;
}

export function clearAllCustomTokens(): void {
  const filePath = getTokensFilePath();
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// List all tokens (default + custom)
export function listTokens(): TokenConfig[] {
  const customTokens = getCustomTokens();
  const allTokens = [...DEFAULT_TOKENS];
  
  for (const [chain, tokens] of Object.entries(customTokens)) {
    tokens.forEach((t) => {
      allTokens.push({ ...t, chain });
    });
  }
  
  return allTokens;
}

// Get token info by symbol and chain
export function getTokenInfo(chain: string, symbol: string): TokenConfig | undefined {
  return listTokens().find(t => t.chain === chain && t.symbol === symbol.toUpperCase());
}
