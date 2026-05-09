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
      // Initialize workspace files
      storage.initWorkspaceFiles(slug);
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
      // Also init workspace files for main agent
      storage.initWorkspaceFiles('main');
      return { success: true };
    } catch (error) {
      console.error('Failed to init agents:', error);
      throw error;
    }
  });

  // Get workspace files list
  ipcMain.handle('agents:workspace:files', async (_event, slug: string) => {
    try {
      return storage.getWorkspaceFiles(slug);
    } catch (error) {
      console.error('Failed to get workspace files:', error);
      throw error;
    }
  });

  // Read workspace file
  ipcMain.handle('agents:workspace:read', async (_event, slug: string, filename: string) => {
    try {
      const content = storage.readWorkspaceFile(slug, filename);
      if (content === null) {
        throw new Error('File not found');
      }
      return { filename, content };
    } catch (error) {
      console.error('Failed to read workspace file:', error);
      throw error;
    }
  });

  // Write workspace file
  ipcMain.handle('agents:workspace:write', async (_event, slug: string, filename: string, content: string) => {
    try {
      const success = storage.writeWorkspaceFile(slug, filename, content);
      if (!success) {
        throw new Error('Failed to write file');
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to write workspace file:', error);
      throw error;
    }
  });

  console.log('Agents IPC handlers registered');
}

// Auto-initialize agents on module load
export function initAgents(): void {
  storage.ensureMainAgent();
  
  // Init workspace files for all existing agents
  const agents = storage.getAgentsList();
  for (const slug of agents) {
    storage.initWorkspaceFiles(slug);
  }
}
