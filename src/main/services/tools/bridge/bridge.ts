import { z } from 'zod';
import { wdkService } from '../../wdk/WDKService';
import { getTokenInfo } from '../../tokens/storage';

// Supported source chains (EVM + Solana chains we support)
const SOURCE_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'solana'] as const;

// Supported destination chains (EVM + Solana)
const DEST_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'solana'] as const;

export const evmBridgeUsdt0Schema = z.object({
  sourceChain: z.enum(SOURCE_CHAINS).describe('Source chain to bridge from (ethereum, polygon, arbitrum, solana)'),
  targetChain: z.enum(DEST_CHAINS).describe('Target chain (ethereum, polygon, arbitrum, solana)'),
  recipient: z.string().describe('Recipient address on target chain'),
  token: z.string().describe('Token symbol (e.g., USDT)'),
  amount: z.string().describe('Amount in human-readable units (e.g., "100")'),
});

export const evmBridgeUsdt0Metadata = {
  uiDescription: 'Bridge USDT0 tokens across chains using LayerZero. Supports EVM to EVM and EVM to Solana bridging.',
  tags: ['bridge', 'layerzero', 'cross-chain', 'ethereum', 'polygon', 'arbitrum', 'solana'],
  requiredTools: [] as string[],
  packages: ['@tetherto/wdk-protocol-bridge-usdt0-evm', '@tetherto/wdk-wallet-evm'],
  parameters: {
    sourceChain: { type: 'string', description: 'Source chain: ethereum, polygon, arbitrum, solana', required: true },
    targetChain: { type: 'string', description: 'Target chain: ethereum, polygon, arbitrum, solana', required: true },
    recipient: { type: 'string', description: 'Recipient address on target chain', required: true },
    token: { type: 'string', description: 'Token to bridge (USDT)', required: true },
    amount: { type: 'string', description: 'Amount to bridge (e.g., "100")', required: true },
  },
};

export const evmBridgeUsdt0Tool = {
  type: 'function' as const,
  name: 'evm_bridge_usdt0',
  description: "Bridge USDT0 tokens across chains via LayerZero. Args: sourceChain, targetChain, recipient, token, amount. Supports EVM to EVM and EVM to Solana.",
  parameters: evmBridgeUsdt0Schema,
  metadata: evmBridgeUsdt0Metadata,
  execute: async ({ sourceChain, targetChain, recipient, token, amount }: {
    sourceChain: string;
    targetChain: string;
    recipient: string;
    token: string;
    amount: string;
  }) => {
    try {
      const tokenInfo = getTokenInfo(sourceChain, token);
      if (!tokenInfo) {
        return JSON.stringify({ isError: true, message: `Token ${token} not found on ${sourceChain}` });
      }

      if (tokenInfo.contractAddress === 'native') {
        return JSON.stringify({ isError: true, message: `Cannot bridge native tokens. Use USDT.` });
      }

      const result = await wdkService.executeBridge(
        sourceChain,
        targetChain,
        recipient,
        tokenInfo.contractAddress,
        amount,
        tokenInfo.decimals
      );

      return JSON.stringify({
        success: true,
        transactionHash: result.hash,
        sourceChain,
        targetChain,
        recipient,
        token,
        amount,
        fee: result.fee,
        bridgeFee: result.bridgeFee,
        approveHash: result.approveHash
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        isError: true,
        message: `Bridge failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  },
};