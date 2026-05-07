import { ipcMain } from 'electron';
import * as storage from './storage';

// Convert name to slug format
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Register sessions IPC handlers
export function registerSessionsIpcHandlers(): void {
  // List sessions for an agent
  ipcMain.handle('sessions:list', async (_event, agentSlug: string) => {
    try {
      const sessions = storage.getSessionsList(agentSlug);
      return sessions;
    } catch (error) {
      console.error('Failed to list sessions:', error);
      throw error;
    }
  });

  // Create new session
  ipcMain.handle('sessions:create', async (_event, agentSlug: string, name: string) => {
    try {
      const slug = nameToSlug(name);
      
      if (storage.sessionExists(agentSlug, slug)) {
        throw new Error('Session with this name already exists');
      }
      
      const result = storage.createSessionFolder(agentSlug, slug);
      return { slug, ...result };
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  });

  // Delete session
  ipcMain.handle('sessions:delete', async (_event, agentSlug: string, sessionSlug: string) => {
    try {
      // Prevent deleting main session
      if (sessionSlug === 'main') {
        throw new Error('Cannot delete the main session');
      }
      
      const deleted = storage.deleteSessionFolder(agentSlug, sessionSlug);
      
      if (!deleted) {
        throw new Error('Session not found');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  });

  // Get session info
  ipcMain.handle('sessions:get', async (_event, agentSlug: string, sessionSlug: string) => {
    try {
      const exists = storage.sessionExists(agentSlug, sessionSlug);
      
      if (!exists) {
        throw new Error('Session not found');
      }
      
      return { slug: sessionSlug, exists: true };
    } catch (error) {
      console.error('Failed to get session:', error);
      throw error;
    }
  });

  // Ensure main session exists
  ipcMain.handle('sessions:ensureMain', async (_event, agentSlug: string) => {
    try {
      storage.ensureMainSession(agentSlug);
      return { success: true };
    } catch (error) {
      console.error('Failed to ensure main session:', error);
      throw error;
    }
  });

  // Save messages
  ipcMain.handle('sessions:saveMessages', async (_event, agentSlug: string, sessionSlug: string, messages: any[]) => {
    try {
      storage.saveMessages(agentSlug, sessionSlug, messages);
      return { success: true };
    } catch (error) {
      console.error('Failed to save messages:', error);
      throw error;
    }
  });

  // Load messages
  ipcMain.handle('sessions:loadMessages', async (_event, agentSlug: string, sessionSlug: string) => {
    try {
      return storage.loadMessages(agentSlug, sessionSlug);
    } catch (error) {
      console.error('Failed to load messages:', error);
      throw error;
    }
  });

  console.log('Sessions IPC handlers registered');
}

// Auto-initialize main session for an agent
export function initSession(agentSlug: string): void {
  storage.ensureMainSession(agentSlug);
}