import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('everclawAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  toggleTheme: () => ipcRenderer.send('theme:toggle'),
  onThemeChanged: (callback: () => void) => {
    ipcRenderer.on('theme:changed', callback);
    return () => ipcRenderer.removeListener('theme:changed', callback);
  },

  // WDK Wallet operations
  wdk: {
    getStatus: () => ipcRenderer.invoke('wdk:getStatus'),
    generateMnemonic: (words?: 12 | 24) => ipcRenderer.invoke('wdk:generateMnemonic', words),
    validateSeedPhrase: (seedPhrase: string) => ipcRenderer.invoke('wdk:validateSeedPhrase', seedPhrase),
    createWallet: (words?: 12 | 24) => ipcRenderer.invoke('wdk:createWallet', words),
    restoreWallet: (seedPhrase: string) => ipcRenderer.invoke('wdk:restoreWallet', seedPhrase),
    initializeFromStored: () => ipcRenderer.invoke('wdk:initializeFromStored'),
    deleteWallet: () => ipcRenderer.invoke('wdk:deleteWallet'),
    revealSeedPhrase: () => ipcRenderer.invoke('wdk:revealSeedPhrase'),
    getAccounts: () => ipcRenderer.invoke('wdk:getAccounts'),
    getAddress: (chain: 'ethereum' | 'polygon' | 'arbitrum' | 'solana' | 'bitcoin') => ipcRenderer.invoke('wdk:getAddress', chain),
    getBalance: (chain: 'ethereum' | 'polygon' | 'arbitrum' | 'solana' | 'bitcoin') => ipcRenderer.invoke('wdk:getBalance', chain),
    signMessageEvm: (message: string) => ipcRenderer.invoke('wdk:signMessageEvm', message),
    signMessageSolana: (message: string) => ipcRenderer.invoke('wdk:signMessageSolana', message),
  },

  // AI (QVAC) operations
  ai: {
    getStatus: () => ipcRenderer.invoke('ai:getStatus'),
    loadModel: () => ipcRenderer.invoke('ai:loadModel'),
    sendPrompt: (message: string, history?: { role: string; content: string }[]) => ipcRenderer.invoke('ai:sendPrompt', message, history),
    unloadModel: () => ipcRenderer.invoke('ai:unloadModel'),
  },

  // Agents operations
  agents: {
    list: () => ipcRenderer.invoke('agents:list'),
    create: (name: string) => ipcRenderer.invoke('agents:create', name),
    delete: (slug: string) => ipcRenderer.invoke('agents:delete', slug),
    get: (slug: string) => ipcRenderer.invoke('agents:get', slug),
    init: () => ipcRenderer.invoke('agents:init'),
  },

  // Logs operations
  logs: {
    get: (lines?: number) => ipcRenderer.invoke('logs:get', lines),
    clear: () => ipcRenderer.invoke('logs:clear'),
  },

  // Sessions operations
  sessions: {
    list: (agentSlug: string) => ipcRenderer.invoke('sessions:list', agentSlug),
    create: (agentSlug: string, name: string) => ipcRenderer.invoke('sessions:create', agentSlug, name),
    delete: (agentSlug: string, sessionSlug: string) => ipcRenderer.invoke('sessions:delete', agentSlug, sessionSlug),
    get: (agentSlug: string, sessionSlug: string) => ipcRenderer.invoke('sessions:get', agentSlug, sessionSlug),
    ensureMain: (agentSlug: string) => ipcRenderer.invoke('sessions:ensureMain', agentSlug),
    saveMessages: (agentSlug: string, sessionSlug: string, messages: any[]) => ipcRenderer.invoke('sessions:saveMessages', agentSlug, sessionSlug, messages),
    loadMessages: (agentSlug: string, sessionSlug: string) => ipcRenderer.invoke('sessions:loadMessages', agentSlug, sessionSlug),
  },
});
