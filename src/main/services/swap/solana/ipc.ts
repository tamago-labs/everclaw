// IPC handlers for Solana Jupiter swap operations
import { ipcMain } from 'electron';
import { getQuote, executeSwap } from './jupiter';
import { wdkService } from '../../wdk/WDKService';

export function registerSolanaSwapIpcHandlers(): void {
  // Get swap quote
  ipcMain.handle('solana:swap:quote', async (_event, inputMint: string, outputMint: string, amount: string) => {
    console.log(`[IPC] solana:swap:quote called with inputMint=${inputMint}, outputMint=${outputMint}, amount=${amount}`);
    try {
      if (!wdkService.isInitialized()) {
        console.log('[IPC] WDK not initialized');
        return { success: false, error: 'Wallet not initialized. Please create or restore your wallet first.' };
      }
      
      const quote = await getQuote(inputMint, outputMint, amount, 50);
      console.log('[IPC] Quote successful:', quote);
      return { success: true, quote };
    } catch (error) {
      console.error('[IPC] Quote failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Execute swap
  ipcMain.handle('solana:swap:execute', async (_event, inputMint: string, outputMint: string, amount: string) => {
    try {
      const result = await executeSwap(inputMint, outputMint, amount, 50);
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
 

  console.log('Solana swap IPC handlers registered');
}