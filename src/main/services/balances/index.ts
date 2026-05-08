import { ipcMain } from 'electron';
import { getAllBalances } from './storage';

export function registerBalancesHandlers(): void {
  // Get all balances for all chains
  ipcMain.handle('balances:getAll', async () => {
    try {
      const balances = await getAllBalances();
      return balances;
    } catch (error) {
      console.error('Failed to get balances:', error);
      throw error;
    }
  });
}