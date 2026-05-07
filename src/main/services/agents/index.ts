import { ipcMain } from 'electron';
import * as storage from './storage';

// Convert name to slug format
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Register agents IPC handlers
export function registerAgentsIpcHandlers(): void {
  // List all agents
  ipcMain.handle('agents:list', async () => {
    try {
      const agents = storage.getAgentsList();
      return agents.map(slug => {
        const info = storage.getAgentInfo(slug);
        return info || { slug, sessionsCount: 0, workspacesCount: 0 };
      });
    } catch (error) {
      console.error('Failed to list agents:', error);
      throw error;
    }
  });

  // Create new agent
  ipcMain.handle('agents:create', async (_event, name: string) => {
    try {
      const slug = nameToSlug(name);
      
      if (storage.agentExists(slug)) {
        throw new Error('Agent with this name already exists');
      }
      
      const result = storage.createAgentFolder(slug);
      return { slug, ...result };
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw error;
    }
  });

  // Delete agent
  ipcMain.handle('agents:delete', async (_event, slug: string) => {
    try {
      // Prevent deleting main agent
      if (slug === 'main') {
        throw new Error('Cannot delete the main agent');
      }
      
      const deleted = storage.deleteAgentFolder(slug);
      
      if (!deleted) {
        throw new Error('Agent not found');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to delete agent:', error);
      throw error;
    }
  });

  // Get agent info
  ipcMain.handle('agents:get', async (_event, slug: string) => {
    try {
      const info = storage.getAgentInfo(slug);
      
      if (!info) {
        throw new Error('Agent not found');
      }
      
      return info;
    } catch (error) {
      console.error('Failed to get agent:', error);
      throw error;
    }
  });

  // Initialize main agent if not exists
  ipcMain.handle('agents:init', async () => {
    try {
      storage.ensureMainAgent();
      return { success: true };
    } catch (error) {
      console.error('Failed to init agents:', error);
      throw error;
    }
  });

  console.log('Agents IPC handlers registered');
}

// Auto-initialize agents on module load
export function initAgents(): void {
  storage.ensureMainAgent();
}