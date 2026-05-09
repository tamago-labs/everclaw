import { ipcMain } from 'electron';
import { z } from 'zod';
import { getAddressTool } from './get_address';
import { getBalanceTool } from './get_balance';
import { getPriceTool } from './get_price';
import { getToolsPreferences, saveToolsPreferences, isToolEnabled, ensureToolsConfigExists } from './storage';

// Tool interface - matches QVAC tool format for tools parameter
interface QvacTool {
  type: 'function';
  name: string;
  description: string;
  parameters: z.ZodSchema;
}

// Extended tool interface with execute function for our use
interface ToolDefinition extends QvacTool {
  execute: (args: Record<string, unknown>) => Promise<string>;
}

// Tool info for UI - includes parameter schema as object
export interface ToolInfo {
  name: string;
  description: string;           // Short description for AI to interpret
  uiDescription: string;       // Long description for UI display
  tags: string[];               // Tags for organization (shown as badges)
  requiredTools: string[];     // Dependencies (other tools that must be enabled)
  parameters: {
    [key: string]: {
      type: string;
      description?: string;
      required: boolean;
    };
  };
}

// All tool definitions - each tool file exports its own definition with execute function
const toolDefinitions: ToolDefinition[] = [
  getAddressTool as unknown as ToolDefinition,
  getBalanceTool as unknown as ToolDefinition,
  getPriceTool as unknown as ToolDefinition,
];

// Get all tool definitions
export function getAllToolDefinitions(): QvacTool[] {
  return toolDefinitions.map(tool => ({
    type: tool.type,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

// Extended tool definition with metadata
interface ToolDefinitionWithMetadata extends ToolDefinition {
  metadata?: {
    uiDescription: string;
    tags: string[];
    requiredTools: string[];
    parameters: Record<string, { type: string; description: string; required: boolean }>;
  };
}

// Get tool info for UI display
export function getToolInfo(): ToolInfo[] {
  return toolDefinitions.map(tool => {
    // Get metadata from tool definition
    const toolWithMeta = tool as ToolDefinitionWithMetadata;
    const meta = toolWithMeta.metadata || { uiDescription: '', tags: [], requiredTools: [], parameters: {} };

    return {
      name: tool.name,
      description: tool.description,
      uiDescription: meta.uiDescription,
      tags: meta.tags,
      requiredTools: meta.requiredTools,
      parameters: meta.parameters,
    };
  });
}

// Get only enabled tools based on preferences
export function getEnabledTools(): QvacTool[] {
  return getAllToolDefinitions().filter(tool => isToolEnabled(tool.name));
}

// Execute a tool by name - automatically finds and calls the tool's execute function
export async function executeTool(toolName: string, args: Record<string, unknown>): Promise<string> {
  const tool = toolDefinitions.find(t => t.name === toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  if (!tool.execute) {
    throw new Error(`Tool ${toolName} has no execute function`);
  }
  return tool.execute(args);
}

// Get tool schema for validation
export function getToolSchema(toolName: string): z.ZodSchema | null {
  const tool = toolDefinitions.find(t => t.name === toolName);
  return tool?.parameters ?? null;
}

// Toggle a tool on/off
export function toggleToolEnabled(toolName: string, enabled: boolean): void {
  const prefs = getToolsPreferences();
  prefs[toolName] = enabled;
  saveToolsPreferences(prefs);
}

// Get all tool statuses
export function getToolsStatus(): { name: string; enabled: boolean }[] {
  const prefs = getToolsPreferences();
  return toolDefinitions.map(tool => ({
    name: tool.name,
    enabled: prefs[tool.name] ?? true,
  }));
}

// Register tools IPC handlers
export function registerToolsIpcHandlers(): void {
  // Ensure config exists on init
  ensureToolsConfigExists();

  // Get all tools with their status
  ipcMain.handle('tools:list', async () => {
    try {
      return getToolsStatus();
    } catch (error) {
      console.error('Failed to list tools:', error);
      throw error;
    }
  });

  // Get tool details for UI
  ipcMain.handle('tools:getInfo', async () => {
    try {
      return getToolInfo();
    } catch (error) {
      console.error('Failed to get tool info:', error);
      throw error;
    }
  });

  // Toggle a tool on/off
  ipcMain.handle('tools:toggle', async (_event, toolName: string, enabled: boolean) => {
    try {
      toggleToolEnabled(toolName, enabled);
      return { success: true };
    } catch (error) {
      console.error('Failed to toggle tool:', error);
      throw error;
    }
  });

  console.log('Tools IPC handlers registered');
}
