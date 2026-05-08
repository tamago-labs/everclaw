import { ipcMain } from 'electron';
import * as storage from './storage';

// Register logs IPC handlers
export function registerLogsIpcHandlers(): void {
  // Get logs
  ipcMain.handle('logs:get', async (_event, lines?: number) => {
    try {
      return storage.getLogs(lines || 100);
    } catch (error) {
      console.error('Failed to get logs:', error);
      throw error;
    }
  });

  // Clear logs
  ipcMain.handle('logs:clear', async () => {
    try {
      storage.clearLogs();
      return { success: true };
    } catch (error) {
      console.error('Failed to clear logs:', error);
      throw error;
    }
  });

  console.log('Logs IPC handlers registered');
}

// Initialize logs directory
export function initLogs(): void {
  storage.initLogs();
}

// Helper function to write a log entry
export function log(message: string): void {
  storage.appendLog(message);
}