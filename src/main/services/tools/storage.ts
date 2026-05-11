import { app } from 'electron';
import { join } from 'path';
import * as fs from 'fs';

const TOOLS_PREFS_FILE = 'tools_preferences.json';

// Default tools - read-only tools enabled, write tools disabled by default
const defaultToolsPreferences: Record<string, boolean> = {
  // Read-only tools (enabled)
  get_address: true,
  get_balance: true,
  get_price: true,
  // Write tools (disabled)
  approve: false,
  transfer: false,
  send_native: false,
  // DEX tools
  evm_velora_quote_swap: false,
  evm_velora_execute_swap: false,
  solana_jupiter_quote_swap: false,
  solana_jupiter_execute_swap: false,
  // Sanctum LST tools
  sanctum_quote_swap: false,
  sanctum_execute_swap: false,
  sanctum_get_lst_info: false,
  sanctum_get_owned_lsts: false,
  // Solayer staking
  solayer_stake: false,
  // Lulo lending
  lulo_quote_supply: false,
  lulo_execute_supply: false,
  lulo_quote_withdraw: false,
  lulo_execute_withdraw: false,
};

export interface ToolsPreferences {
  [key: string]: boolean;
}

function getToolsPrefsPath(): string {
  return join(app.getPath('userData'), TOOLS_PREFS_FILE);
}

// Ensure config file exists with defaults
export function ensureToolsConfigExists(): void {
  const prefsPath = getToolsPrefsPath();
  try {
    if (!fs.existsSync(prefsPath)) {
      // Create directory if needed
      const dir = app.getPath('userData');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Write default preferences
      fs.writeFileSync(prefsPath, JSON.stringify(defaultToolsPreferences, null, 2));
      console.log('[Tools] Created default preferences file');
    }
  } catch (error) {
    console.error('[Tools] Failed to create preferences file:', error);
  }
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
  return prefs[toolName] ?? false;
}