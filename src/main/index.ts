import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import {
  QWEN3_4B_INST_Q4_K_M,
  QWEN3_1_7B_INST_Q4,
  loadModel,
  unloadModel,
  completion,
  type ToolCall
} from '@qvac/sdk';
import { wdkService } from './services/wdk';
import * as storage from './services/wdk/storage';
import { registerAgentsIpcHandlers, initAgents } from './services/agents';
import { registerLogsIpcHandlers, initLogs, log as logService } from './services/logs';
import { registerSessionsIpcHandlers } from './services/sessions';
import { registerTokensHandlers } from './services/tokens';
import { registerBalancesHandlers } from './services/balances';
import { registerPricingHandlers } from './services/pricing';
import { getEnabledTools, executeTool, getToolSchema, registerToolsIpcHandlers } from './services/tools';
import { registerCronsIpcHandlers, cronService } from './services/crons';
import { compileSystemPrompt } from './services/agents/promptBuilder';
import { setModelId } from './services/aiService';

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

// Available models for selection
export type ModelType = '4B' | '1.7B';

export const MODEL_INFO = {
  '1.7B': {
    name: 'Qwen3-1.7B',
    specs: '8GB+ RAM • ~1.5GB disk',
    recommended: 'Low-spec'
  },
  '4B': {
    name: 'Qwen3-4B',
    specs: '16GB+ RAM • ~3-4GB disk',
    recommended: 'High-spec'
  }
} as const;

function getModelSource(modelType: ModelType) {
  return modelType === '4B' ? QWEN3_4B_INST_Q4_K_M : QWEN3_1_7B_INST_Q4;
}

function getModelName(modelType: ModelType): string {
  return MODEL_INFO[modelType].name;
}

// Load QVAC service with selected model
async function loadQVACService(modelType: ModelType = '1.7B'): Promise<string | null> {
  try {
    const modelSource = getModelSource(modelType);
    const modelDisplayName = getModelName(modelType);
    
    logService(`[QVAC] Loading ${modelDisplayName}...`);
    
    modelId = await loadModel({
      modelSrc: modelSource,
      modelType: 'llm',
      modelConfig: {
        ctx_size: 8192,
        tools: true,
      },
      onProgress: (progress) => {
        const progressMsg = typeof progress === 'string' ? progress : JSON.stringify(progress);
        console.log(progress);
        logService(`[QVAC] ${progressMsg}`);
      }
    });
    
    console.log('QVAC model loaded:', modelId);
    logService(`[QVAC] ${modelDisplayName} loaded successfully`);
    
    // Sync model ID to aiService for cron jobs
    setModelId(modelId);
    
    return modelId;
  } catch (error) {
    console.error('Failed to load QVAC Service:', error);
    logService(`[QVAC] Failed to load: ${error instanceof Error ? error.message : String(error)}`);
    return null;
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
        storageBackend: storage.getStorageBackend()
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

  ipcMain.handle('wdk:createWallet', async (_event, seedPhrase?: string) => {
    try {
      // If seed phrase is provided, use it; otherwise generate new one
      const finalSeed = seedPhrase || wdkService.generateMnemonic(24);
      storage.encryptAndStoreSeed(finalSeed);
      wdkService.initializeWithSeed(finalSeed);


      return finalSeed;
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
      console.log('[MCP] Server disposed after wallet deletion');
      logService('[MCP] Server disposed after wallet deletion');
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
  ipcMain.handle('wdk:getAddress', async (_event, chain: 'ethereum' | 'polygon' | 'arbitrum' | 'solana' | 'bitcoin') => {
    try {
      return await wdkService.getAddress(chain);
    } catch (error) {
      console.error(`Failed to get ${chain} address:`, error);
      throw error;
    }
  });

  // Balance - supports all chains
  ipcMain.handle('wdk:getBalance', async (_event, chain: 'ethereum' | 'polygon' | 'arbitrum' | 'solana' | 'bitcoin') => {
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

  // Get available models info
  ipcMain.handle('ai:getModels', async () => {
    return MODEL_INFO;
  });

  // Select and load model
  ipcMain.handle('ai:selectModel', async (_event, modelType: ModelType) => {
    try {
      // Unload existing model if any
      if (modelId) {
        await unloadModel({ modelId });
        modelId = null;
      }
      
      // Load the selected model
      const loadedModelId = await loadQVACService(modelType);
      
      if (loadedModelId) {
        return { success: true, modelId: loadedModelId, modelType };
      } else {
        return { success: false, error: 'Failed to load model' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load model';
      return { success: false, error: message };
    }
  });

  // Load model (legacy, loads default)
  ipcMain.handle('ai:loadModel', async () => {
    try {
      if (!modelId) {
        modelId = await loadModel({
          modelSrc: QWEN3_1_7B_INST_Q4,
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

  // Send prompt to AI (non-streaming)
  // ipcMain.handle('ai:sendPrompt', async (_event, message: string, history: { role: string; content: string }[] = [], agentSlug?: string) => {
  //   try {
  //     if (!modelId) {
  //       throw new Error('AI model not loaded');
  //     }
      
  //     // Compile system prompt if agentSlug provided
  //     let finalHistory = history;
  //     if (agentSlug) {
  //       const systemPrompt = await compileSystemPrompt(agentSlug);
  //       finalHistory = [{ role: 'system', content: systemPrompt }, ...history];
  //     }
      
  //     return await executeCompletionWithTools(null, finalHistory, message);
  //   } catch (error) {
  //     const message = error instanceof Error ? error.message : 'Failed to get AI response';
  //     return { success: false, error: message };
  //   }
  // });

  // Helper function to execute a completion and handle tool calls
  // Supports both streaming (with event sender) and non-streaming (event = null)
  async function executeCompletionWithTools(
    event: Electron.IpcMainInvokeEvent | null,
    initialHistory: { role: string; content: string }[],
    initialMessage?: string
  ): Promise<{ success: boolean; response: string; error?: string }> {
    // Build conversation history
    const conversationHistory = initialMessage
      ? [...initialHistory, { role: 'user', content: initialMessage }]
      : [...initialHistory];

    let fullResponse = '';
    const maxToolCalls = 5; // Prevent infinite loops
    let toolCallCount = 0;

    while (toolCallCount < maxToolCalls) {
      const result = completion({
        modelId: modelId!,
        history: conversationHistory,
        stream: true,
        kvCache: true,
        captureThinking: true,
        tools: getEnabledTools() as any
      });

      // Stream completion events
      for await (const streamEvent of result.events) {
        switch (streamEvent.type) {
          case "contentDelta":
            fullResponse += streamEvent.text;
            if (event) event.sender.send('ai:streamToken', streamEvent.text);
            break;
          case "thinkingDelta":
            if (event) event.sender.send('ai:streamThinking', streamEvent.text);
            break;
          case "toolCall":
            console.log(`\n→ Tool: ${streamEvent.call.name}(${JSON.stringify(streamEvent.call.arguments)})`);
            break;
          case "toolError":
            console.warn(`\n⚠ Tool error [${streamEvent.error.code}]: ${streamEvent.error.message}`);
            break;
          case "completionStats":
            console.log(`\n📊 ${streamEvent.stats.tokensPerSecond?.toFixed(1)} tok/s`);
            break;
          case "completionDone":
            if (streamEvent.stopReason === "error" && "error" in streamEvent) {
              console.error(`\n❌ ${streamEvent.error.message}`);
            }
            break;
          case "rawDelta":
            break;
        }
      }

      // Get tool calls from result
      const toolCalls: ToolCall[] = await result.toolCalls;

      if (toolCalls.length === 0) {
        // No more tool calls, we're done
        break;
      }

      toolCallCount++;

      // Validate and log tool calls
      for (const call of toolCalls) {
        console.log(`  - ${call.name}(${JSON.stringify(call.arguments)})`);
        logService(`[Tool] ${call.name}(${JSON.stringify(call.arguments)})`);
        const schema = getToolSchema(call.name);
        if (schema) {
          const validated = schema.safeParse(call.arguments);
          if (validated.success) {
            console.log(`    ✓ Arguments validated with Zod`);
            logService(`[Tool] ${call.name}: Arguments validated`);
          } else {
            console.log(`    ✗ Validation failed:`, validated.error);
            logService(`[Tool] ${call.name}: Validation failed`);
          }
        }
      }

      // Execute tool calls
      console.log("\n🔧 Executing Tool Calls...");
      logService(`[Tool] Executing ${toolCalls.length} tool call(s)...`);
      const toolResults = await Promise.all(toolCalls.map(async (call) => {
        const result = await executeTool(call.name, call.arguments as Record<string, unknown>);
        console.log(`  ✓ ${call.name}: ${result}`);
        logService(`[Tool] ${call.name}: ${result}`);
        return { toolCallId: call.id, result };
      }));

      // Add tool results to history
      for (const toolResult of toolResults) {
        conversationHistory.push({
          role: "tool",
          content: toolResult.result,
        });
      }

      console.log(`\n🔄 Tool call ${toolCallCount} completed, continuing with follow-up...\n`);
    }

    // Send empty token to signal completion (only for streaming)
    if (event) event.sender.send('ai:streamToken', '');
    return { success: true, response: fullResponse };
  }

  // Send prompt to AI (streaming) - Updated handler
  ipcMain.handle('ai:sendPromptStream', async (event, message: string, history: { role: string; content: string }[] = [], agentSlug?: string) => {
    try {
      if (!modelId) {
        throw new Error('AI model not loaded');
      }
      
      // Compile system prompt if agentSlug provided
      let finalHistory = history;
      if (agentSlug) {
        const systemPrompt = await compileSystemPrompt(agentSlug);
        finalHistory = [{ role: 'system', content: systemPrompt }, ...history];
      }
      
      return await executeCompletionWithTools(event, finalHistory, message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get AI response';
      event.sender.send('ai:streamToken', '');
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

  // Load WDK and MCP services if there's a stored seed
  if (storage.isSeedStored()) {
    try {
      const seedPhrase = storage.decryptStoredSeed();
      wdkService.initializeWithSeed(seedPhrase);
      console.log('[WDK] Initialized from stored seed');
      logService('[WDK] Initialized from stored seed');

    } catch (error) {
      console.error('[WDK] Failed to initialize:', error);
      logService(`[WDK] Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Initialize agents (create main agent if not exists)
  initAgents();

  // Initialize logs directory
  initLogs();
  logService('[App] Starting Everclaw...');

  // Register agents IPC handlers
  registerAgentsIpcHandlers();

  // Register logs IPC handlers
  registerLogsIpcHandlers();

  // Register sessions IPC handlers
  registerSessionsIpcHandlers();

  // Register tokens IPC handlers
  registerTokensHandlers();

  // Register balances IPC handlers
  registerBalancesHandlers();

  // Register pricing IPC handlers
  registerPricingHandlers();

  // Register tools IPC handlers
  registerToolsIpcHandlers();

  // Register crons IPC handlers
  registerCronsIpcHandlers();

  // Register IPC handlers
  registerWDKIpcHandlers();
  registerQVACIpcHandlers();

  // Create window
  createWindow();
  
  // Start cron service
  cronService.start();
  
  // Note: Model is not auto-loaded. User will select model via UI.
  logService('[App] Everclaw ready. Select AI model to begin.');
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

// Unload model and stop cron service before quitting
app.on('before-quit', async () => {
  // Stop cron service
  cronService.stop();
  
  if (modelId) {
    try {
      await unloadModel({ modelId });
      logService('[QVAC] Model unloaded on exit');
    } catch (error) {
      console.error('Failed to unload model:', error);
    }
  }
});
