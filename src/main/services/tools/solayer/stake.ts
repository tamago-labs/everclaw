import { z } from 'zod';
import { wdkService } from '../../wdk/WDKService';
import { executeTransaction } from '../../solana/execute';

export const solayerStakeSchema = z.object({
  amount: z.string().describe('Amount of SOL to stake (e.g., "1.5")'),
});

export const solayerStakeMetadata = {
  uiDescription: 'Stake SOL to receive sSOL on Solayer.',
  tags: ['staking', 'solana'],
  requiredTools: [] as string[],
  packages: [] as string[],
  parameters: {
    amount: { type: 'string', description: 'Amount of SOL to stake (e.g., "1.5")', required: true },
  },
};

export const solayerStakeTool = {
  type: 'function' as const,
  name: 'solayer_stake',
  description: "Stake SOL to receive sSOL on Solayer. Args: amount (SOL amount).",
  parameters: solayerStakeSchema,
  metadata: solayerStakeMetadata,
  execute: async ({ amount }: { amount: string }) => {
    try {
      const walletAddress = await wdkService.getAddress('solana');
      
      // Call Solayer API to get stake transaction
      const response = await fetch(
        `https://app.solayer.org/api/action/restake/ssol?amount=${amount}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account: walletAddress,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Staking request failed');
      }

      const data = await response.json();

      // Execute the transaction (API returns base64 encoded transaction)
      const result = await executeTransaction(data.transaction);
      
      return JSON.stringify({
        success: true,
        transactionHash: result.signature,
        amount,
        outputToken: 'sSOL',
      }, null, 2);
    } catch (error) {
      return JSON.stringify({ 
        isError: true, 
        message: `Solayer staking failed: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  },
};