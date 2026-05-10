// Sanctum API service for LST operations

import { SANCTUM_STAT_API_URI, SANCTUM_TRADE_API_URI } from './constants';

// Types for Sanctum API responses
export interface LSTQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
}

export interface OwnedLST {
  mint: string;
  amount: number;
  value: number;
}

// Helper to serialize array params like ?lst=X&lst=Y
function serializeArrayParams(paramName: string, values: string[]): string {
  return values.map(v => `${paramName}=${v}`).join('&');
}

// Get LST price from stat API (returns array format)
export async function getLSTPrice(mint: string): Promise<number> {
  const params = serializeArrayParams('lst', [mint]);
  const response = await fetch(`${SANCTUM_STAT_API_URI}/v1/sol-value/current?${params}`);
  const data = await response.json();
  
  // Response is { solValues: [{ mint, amount }] }
  const solValues = data.solValues || [];
  const lstData = solValues.find((v: { mint: string; amount: number }) => v.mint === mint);
  return lstData?.amount || 0;
}

// Get LST APY from stat API
export async function getLSTAPY(mint: string): Promise<number> {
  const params = serializeArrayParams('lst', [mint]);
  const response = await fetch(`${SANCTUM_STAT_API_URI}/v1/apy/latest?${params}`);
  const data = await response.json();
  
  // Response is { apys: { [mint]: number } }
  const apys = data.apys || {};
  return apys[mint] || 0;
}

// Get LST TVL from trade API
export async function getLSTTVL(mint: string): Promise<number> {
  const params = serializeArrayParams('lst', [mint]);
  const response = await fetch(`${SANCTUM_TRADE_API_URI}/v1/tvl/current?${params}`);
  const data = await response.json();
  
  // Response is { tvls: { [mint]: string } }
  const tvls = data.tvls || {};
  return parseFloat(tvls[mint] || '0');
}

// Get owned LSTs by scanning wallet token accounts
export async function getOwnedLSTs(walletAddress: string): Promise<OwnedLST[]> {
  const { Connection, PublicKey } = await import('@solana/web3.js');
  
  // Token program ID for SPL tokens
  const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  
  const connection = new Connection(
    'https://solana-mainnet.g.alchemy.com/v2/46BFnBkjDdWActWG5HvRV',
    { commitment: 'confirmed' }
  );
  
  const walletPubkey = new PublicKey(walletAddress);
  
  // Get all token accounts for the wallet
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
    programId: TOKEN_PROGRAM_ID,
  });
  
  // Filter out zero balance tokens
  const nonZeroTokens = tokenAccounts.value.filter(
    (v) => v.account.data.parsed.info.tokenAmount.uiAmount !== 0
  );
  
  // Get tokens with 9 decimals (typical for LSTs)
  const tokens = nonZeroTokens.map((v) => ({
    mint: v.account.data.parsed.info.mint as string,
    amount: v.account.data.parsed.info.tokenAmount.uiAmount as number,
    decimals: v.account.data.parsed.info.tokenAmount.decimals as number,
  })).filter(t => t.decimals === 9);
  
  const addresses = tokens.map(t => t.mint);
  
  // Check which are LSTs via Sanctum API
  const params = serializeArrayParams('lst', addresses);
  const response = await fetch(`${SANCTUM_STAT_API_URI}/v1/sol-value/current?${params}`);
  const data = await response.json();
  
  const lstMints = Object.keys(data.solValues || {});
  
  // Return only tokens that are LSTs
  return tokens
    .filter(t => lstMints.includes(t.mint))
    .map(t => ({ mint: t.mint, amount: t.amount, value: 0 }));
}

// Get quote for LST swap from trade API
export async function getLSTQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number = 50
): Promise<LSTQuote> {
  const response = await fetch(`${SANCTUM_TRADE_API_URI}/v1/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      inputMint,
      mode: 'ExactIn',
      outputMint,
      slippageBps,
    }),
  });

  return response.json();
}

// Get swap transaction (for execution)
export async function getSwapTransaction(
  inputMint: string,
  outputMint: string,
  amount: string,
  quotedAmount: string,
  walletAddress: string,
  priorityFee: number = 50000
): Promise<string> {
  const response = await fetch(`${SANCTUM_TRADE_API_URI}/v1/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      dstLstAcc: null,
      input: inputMint,
      mode: 'ExactIn',
      priorityFee: {
        Auto: {
          max_unit_price_micro_lamports: priorityFee,
          unit_limit: 300000,
        },
      },
      outputLstMint: outputMint,
      quotedAmount,
      signer: walletAddress,
      srcLstAcc: null,
    }),
  });

  const data = await response.json();
  return data.tx;
}

// Get all available LST mints
export function getAvailableLSTMints(): Record<string, string> {
  // Import here to avoid circular deps
  const { SANCTUM_LST_MINTS } = require('./constants');
  return SANCTUM_LST_MINTS;
}