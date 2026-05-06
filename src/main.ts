import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0F1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  await loadWDKService();
  registerWDKIpcHandlers();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// WDK Service - imported dynamically to handle native modules
let wdkService: any = null;

async function loadWDKService() {
  try {
    const wdk = await import('./services/wdk');
    wdkService = wdk.wdkService;
    console.log('WDK Service loaded successfully');
  } catch (error) {
    console.error('Failed to load WDK Service:', error);
  }
}

// Register IPC handlers for WDK - called after service is loaded
function registerWDKIpcHandlers() {
  if (!wdkService) {
    console.warn('WDK Service not loaded, skipping IPC handlers');
    return;
  }

  // Import storage functions
  const storage = {
    isSeedStored: () => {
      const fs = require('fs');
      const path = require('path');
      const seedPath = path.join(app.getPath('userData'), 'wdk-seed.enc');
      return fs.existsSync(seedPath);
    },
    isEncryptionAvailable: () => {
      const { safeStorage } = require('electron');
      return safeStorage.isEncryptionAvailable();
    },
    getStorageBackend: () => {
      try {
        const { safeStorage } = require('electron');
        return safeStorage.getSelectedStorageBackend?.() || 'OS-Level Encryption';
      } catch {
        return 'OS-Level Encryption';
      }
    },
    encryptAndStoreSeed: (seedPhrase: string) => {
      const { safeStorage } = require('electron');
      const fs = require('fs');
      const path = require('path');
      const seedPath = path.join(app.getPath('userData'), 'wdk-seed.enc');
      const encryptedBuffer = safeStorage.encryptString(seedPhrase);
      fs.writeFileSync(seedPath, encryptedBuffer);
    },
    decryptStoredSeed: () => {
      const { safeStorage } = require('electron');
      const fs = require('fs');
      const path = require('path');
      const seedPath = path.join(app.getPath('userData'), 'wdk-seed.enc');
      if (!fs.existsSync(seedPath)) {
        throw new Error('No seed phrase found. Please create or restore a wallet first.');
      }
      const encryptedBuffer = fs.readFileSync(seedPath);
      return safeStorage.decryptString(encryptedBuffer);
    },
    deleteStoredSeed: () => {
      const fs = require('fs');
      const path = require('path');
      const seedPath = path.join(app.getPath('userData'), 'wdk-seed.enc');
      if (fs.existsSync(seedPath)) {
        fs.unlinkSync(seedPath);
      }
    },
  };

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
