// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
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
    getAddress: (chain: 'ethereum' | 'solana' | 'bitcoin') => ipcRenderer.invoke('wdk:getAddress', chain),
    getBalance: (chain: 'ethereum' | 'solana' | 'bitcoin') => ipcRenderer.invoke('wdk:getBalance', chain),
    signMessageEvm: (message: string) => ipcRenderer.invoke('wdk:signMessageEvm', message),
    signMessageSolana: (message: string) => ipcRenderer.invoke('wdk:signMessageSolana', message),
  },
});
