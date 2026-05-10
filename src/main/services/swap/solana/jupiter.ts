// Jupiter swap service for Solana - reusable by tools and frontend
// Uses raw RPC for Jupiter API calls, WDK for signing

import { wdkService } from '../../wdk/WDKService';

const JUP_API = 'https://api.jup.ag';
const JUP_API_KEY = 'jup_adfecd9bfa0152d47376553f3d1ad18cc80e93ba9053c21dea17b65cbe98e752';

// Standard Solana token mints
export const SOLANA_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
};

// Jupiter API types
interface OrderResponse {
  transaction?: string;
  requestId?: string;
  error?: string;
}

interface ExecuteResponse {
  signature?: string;
  status?: string;
  error?: string;
}

// Jupiter quote response type
export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
}

// Get quote for a swap (for display purposes)
export async function getQuote(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number = 50 // 0.5% default
): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: slippageBps.toString(),
    swapMode: 'ExactIn',
  });
  
  const url = `${JUP_API}/swap/v1/quote?${params.toString()}`;
  console.log(`[Jupiter] Fetching quote: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-key': JUP_API_KEY,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Jupiter] Quote API error ${response.status}: ${errorText}`);
      throw new Error(`Jupiter API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Jupiter] Quote received: inAmount=${data.inAmount}, outAmount=${data.outAmount}`);
    return data;
  } catch (error) {
    console.error(`[Jupiter] Fetch failed:`, error);
    throw error;
  }
}

// Execute a Jupiter swap using the /order and /execute flow
export async function executeSwap(
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number = 50
): Promise<{
  success: boolean;
  transactionHash?: string;
  inputAmount?: string;
  outputAmount?: string;
  error?: string;
}> {
  console.log(`[Jupiter] Starting swap: input=${inputMint}, output=${outputMint}, amount=${amount}`);
  
  try {
    // Step 1: Get an order (unsigned transaction)
    const walletAddress = await wdkService.getAddress('solana');
    console.log(`[Jupiter] User wallet: ${walletAddress}`);
    
    const orderUrl = `${JUP_API}/swap/v2/order?` + new URLSearchParams({
      inputMint,
      outputMint,
      amount,
      taker: walletAddress,
      slippageBps: slippageBps.toString(),
    }).toString();
    
    console.log(`[Jupiter] Getting order from: ${orderUrl}`);
    
    const orderResponse = await fetch(orderUrl, {
      headers: { 'x-api-key': JUP_API_KEY },
    });
    
    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error(`[Jupiter] /order failed: ${orderResponse.status}`, errorText);
      return { success: false, error: `Order failed: ${errorText}` };
    }
    
    const order: OrderResponse = await orderResponse.json();
    console.log(`[Jupiter] Order received, requestId: ${order.requestId}`);
    
    if (!order.transaction) {
      console.error('[Jupiter] No transaction in response:', JSON.stringify(order, null, 2));
      return { success: false, error: 'No transaction in order response' };
    }
    
    // Step 2: Sign the transaction using WDK
    console.log(`[Jupiter] Signing transaction...`);
    const signedResult = await wdkService.signJupiterTransaction(order.transaction);
    
    if (!signedResult.signedTransaction) {
      return { success: false, error: 'No signature returned from signing' };
    }
    
    const signedTransaction = signedResult.signedTransaction;
    console.log(`[Jupiter] Transaction signed`);
    
    // Step 3: Execute via /execute endpoint
    console.log(`[Jupiter] Executing via /swap/v2/execute...`);
    const executeResponse = await fetch(`${JUP_API}/swap/v2/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': JUP_API_KEY,
      },
      body: JSON.stringify({
        signedTransaction,
        requestId: order.requestId,
      }),
    });
    
    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      console.error(`[Jupiter] /execute failed: ${executeResponse.status}`, errorText);
      return { success: false, error: `Execute failed: ${errorText}` };
    }
    
    const result: ExecuteResponse = await executeResponse.json();
    console.log(`[Jupiter] Execution result:`, result);
    
    if (result.signature) {
      console.log(`[Jupiter] https://solscan.io/tx/${result.signature}`);
    }
    
    if (result.status === 'Success') {
      console.log('[Jupiter] Swap successful');
      return {
        success: true,
        transactionHash: result.signature || '',
        inputAmount: (BigInt(amount) / BigInt(10 ** 9)).toString(),
        outputAmount: undefined,
      };
    } else {
      console.error('[Jupiter] Swap failed:', result.error);
      return {
        success: false,
        error: result.error || 'Swap failed',
        transactionHash: result.signature || '',
      };
    }
  } catch (error) {
    console.error(`[Jupiter] Swap failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Quote only (no execution)
export async function quoteSwap(
  inputMint: string,
  outputMint: string,
  amount: string
): Promise<{
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: string;
  fee: string;
}> {
  const quote = await getQuote(inputMint, outputMint, amount, 50);
  
  return {
    inputMint: quote.inputMint,
    outputMint: quote.outputMint,
    inputAmount: (BigInt(quote.inAmount) / BigInt(10 ** 9)).toString(),
    outputAmount: (BigInt(quote.outAmount) / BigInt(10 ** 9)).toString(),
    priceImpact: quote.priceImpactPct,
    fee: '0',
  };
}

// Helper to get token decimals
export function getTokenDecimals(mint: string): number {
  if (mint === SOLANA_TOKENS.SOL) return 9;
  return 6;
}