import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import {
  LLAMA_3_2_1B_INST_Q4_0,
  loadModel,
  unloadModel,
  completion
} from '@qvac/sdk'; 
import { wdkService } from './services/wdk';
import * as storage from './services/wdk/storage';

app.commandLine.appendSwitch('no-sandbox');


let win: BrowserWindow | null = null;
let modelId: string | null = null;

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0F1117',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.on('ready-to-show', () => win!.show());

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// ============================================
// QVAC Service - AI Model (Main Process)
// ============================================

// Load QVAC service
async function loadQVACService(): Promise<void> {
  try {
    modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      modelType: 'llm',
      onProgress: (progress) => console.log(progress)
    });
    console.log('QVAC model loaded:', modelId);
  } catch (error) {
    console.error('Failed to load QVAC Service:', error);
  }
}

// ============================================
// WDK IPC Handlers
// ============================================

function registerWDKIpcHandlers(): void {
  // Wallet status
  ipcMain.handle('wdk:getStatus', async () => {
    try {
      return {
        isInitialized: wdkService.isInitialized(),
        hasStoredSeed: storage.isSeedStored(),
        isEncryptionAvailable: storage.isEncryptionAvailable(),
        storageBackend: storage.getStorageBackend(),
      };
    } catch (error) {
      console.error('Failed to get WDK status:', error);
      throw error;
    }
  });

  // Seed phrase management
  ipcMain.handle('wdk:generateMnemonic', async (_event, words?: 12 | 24) => {
    try {
      return wdkService.generateMnemonic(words);
    } catch (error) {
      console.error('Failed to generate mnemonic:', error);
      throw error;
    }
  });

  ipcMain.handle('wdk:validateSeedPhrase', async (_event, seedPhrase: string) => {
    try {
      return wdkService.isValidSeedPhrase(seedPhrase);
    } catch (error) {
      console.error('Failed to validate seed phrase:', error);
      throw error;
    }
  });

  ipcMain.handle('wdk:createWallet', async (_event, words?: 12 | 24) => {
    try {
      const seedPhrase = wdkService.generateMnemonic(words);
      storage.encryptAndStoreSeed(seedPhrase);
      wdkService.initializeWithSeed(seedPhrase);
      return seedPhrase;
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw error;
    }
  });

  ipcMain.handle('wdk:restoreWallet', async (_event, seedPhrase: string) => {
    try {
      if (!wdkService.isValidSeedPhrase(seedPhrase)) {
        throw new Error('Invalid seed phrase');
      }
      storage.encryptAndStoreSeed(seedPhrase);
      wdkService.initializeWithSeed(seedPhrase);
      return true;
    } catch (error) {
      console.error('Failed to restore wallet:', error);
      throw error;
    }
  });

  ipcMain.handle('wdk:initializeFromStored', async () => {
    try {
      const seedPhrase = storage.decryptStoredSeed();
      wdkService.initializeWithSeed(seedPhrase);
      return true;
    } catch (error) {
      console.error('Failed to initialize from stored seed:', error);
      throw error;
    }
  });

  ipcMain.handle('wdk:deleteWallet', async () => {
    try {
      wdkService.dispose();
      storage.deleteStoredSeed();
      return true;
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      throw error;
    }
  });

  // Reveal seed phrase
  ipcMain.handle('wdk:revealSeedPhrase', async () => {
    try {
      return storage.decryptStoredSeed();
    } catch (error) {
      console.error('Failed to reveal seed phrase:', error);
      throw error;
    }
  });

  // Account management - get all accounts
  ipcMain.handle('wdk:getAccounts', async () => {
    try {
      return await wdkService.getAccounts();
    } catch (error) {
      console.error('Failed to get accounts:', error);
      throw error;
    }
  });

  // Get address for a specific chain
  ipcMain.handle('wdk:getAddress', async (_event, chain: 'ethereum' | 'solana' | 'bitcoin') => {
    try {
      return await wdkService.getAddress(chain);
    } catch (error) {
      console.error(`Failed to get ${chain} address:`, error);
      throw error;
    }
  });

  // Balance - supports all three chains
  ipcMain.handle('wdk:getBalance', async (_event, chain: 'ethereum' | 'solana' | 'bitcoin') => {
    try {
      return await wdkService.getBalance(chain);
    } catch (error) {
      console.error(`Failed to get ${chain} balance:`, error);
      throw error;
    }
  });

  // Signing
  ipcMain.handle('wdk:signMessageEvm', async (_event, message: string) => {
    try {
      return await wdkService.signMessageEvm(message);
    } catch (error) {
      console.error('Failed to sign message (EVM):', error);
      throw error;
    }
  });

  ipcMain.handle('wdk:signMessageSolana', async (_event, message: string) => {
    try {
      return await wdkService.signMessageSolana(message);
    } catch (error) {
      console.error('Failed to sign message (Solana):', error);
      throw error;
    }
  });

  console.log('WDK IPC handlers registered');
}

// ============================================
// QVAC IPC Handlers
// ============================================

function registerQVACIpcHandlers(): void {
  // Get AI status
  ipcMain.handle('ai:getStatus', async () => {
    return {
      isReady: modelId !== null,
      modelId: modelId,
    };
  });

  // Load model
  ipcMain.handle('ai:loadModel', async () => {
    try {
      if (!modelId) {
        modelId = await loadModel({
          modelSrc: LLAMA_3_2_1B_INST_Q4_0,
          modelType: 'llm',
          onProgress: (progress) => console.log(progress)
        });
      }
      return { success: true, modelId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load model';
      return { success: false, error: message };
    }
  });

  // Send prompt to AI
  ipcMain.handle('ai:sendPrompt', async (_event, message: string) => {
    try {
      if (!modelId) {
        throw new Error('AI model not loaded');
      }
      const history = [{ role: 'user', content: message }];
      let fullResponse = '';
      const result = completion({ modelId, history, stream: true });
      for await (const token of result.tokenStream) {
        fullResponse += token;
      }
      return { success: true, response: fullResponse };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get AI response';
      return { success: false, error: message };
    }
  });

  // Unload model
  ipcMain.handle('ai:unloadModel', async () => {
    try {
      if (modelId) {
        await unloadModel({ modelId });
        modelId = null;
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unload model';
      return { success: false, error: message };
    }
  });

  console.log('QVAC IPC handlers registered');
}

// ============================================
// App Lifecycle
// ============================================

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.tamagolabs.everclaw');
  
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Load WDK service if there's a stored seed
  if (storage.isSeedStored()) {
    try {
      const seedPhrase = storage.decryptStoredSeed();
      wdkService.initializeWithSeed(seedPhrase);
      console.log('WDK initialized from stored seed');
    } catch (error) {
      console.error('Failed to initialize WDK from stored seed:', error);
    }
  }

  // Register IPC handlers
  registerWDKIpcHandlers();
  registerQVACIpcHandlers();

  // Create window
  createWindow();

  // Load QVAC model in background
  loadQVACService();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
