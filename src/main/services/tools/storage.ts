import { app } from 'electron';
import { join } from 'path';
import * as fs from 'fs';

const TOOLS_PREFS_FILE = 'tools_preferences.json';

// Default tools with enabled state
const defaultToolsPreferences: Record<string, boolean> = {
  get_weather: true,
  get_horoscope: true,
};

export interface ToolsPreferences {
  [key: string]: boolean;
}

function getToolsPrefsPath(): string {
  return join(app.getPath('userData'), TOOLS_PREFS_FILE);
}

export function getToolsPreferences(): ToolsPreferences {
  try {
    const prefsPath = getToolsPrefsPath();
    if (fs.existsSync(prefsPath)) {
      const data = fs.readFileSync(prefsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Tools] Failed to load preferences:', error);
  }
  return { ...defaultToolsPreferences };
}

export function saveToolsPreferences(prefs: ToolsPreferences): void {
  try {
    const prefsPath = getToolsPrefsPath();
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  } catch (error) {
    console.error('[Tools] Failed to save preferences:', error);
  }
}

export function getEnabledToolNames(): string[] {
  const prefs = getToolsPreferences();
  return Object.entries(prefs)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
}

export function toggleTool(toolName: string, enabled: boolean): void {
  const prefs = getToolsPreferences();
  prefs[toolName] = enabled;
  saveToolsPreferences(prefs);
}

export function isToolEnabled(toolName: string): boolean {
  const prefs = getToolsPreferences();
  return prefs[toolName] ?? true;
}
