import { ipcMain } from 'electron';
import { getCustomTokens, addCustomToken, removeCustomToken, clearAllCustomTokens, listTokens, TokenConfig } from './storage';

export function registerTokensHandlers(): void {
  // List all tokens (default + custom)
  ipcMain.handle('tokens:list', async () => {
    return listTokens();
  });

  // Get custom tokens only
  ipcMain.handle('tokens:getCustom', async () => {
    return getCustomTokens();
  });

  // Add a custom token
  ipcMain.handle('tokens:add', async (_, chain: string, token: Omit<TokenConfig, 'chain'>) => {
    addCustomToken(chain, { ...token, chain });
    return true;
  });

  // Remove a custom token
  ipcMain.handle('tokens:remove', async (_, chain: string, symbol: string) => {
    return removeCustomToken(chain, symbol);
  });

  // Clear all custom tokens
  ipcMain.handle('tokens:clear', async () => {
    clearAllCustomTokens();
    return true;
  });
}