import { ipcMain } from 'electron';
import { 
  getAllCronJobs, 
  getCronsList,
  getCronConfig,
  saveCronConfig,
  deleteCronConfig,
  createCronFolder,
  type CronJob 
} from './storage';
import { cronService } from './CronService';

export { cronService };

export function registerCronsIpcHandlers(): void {
  // Get all cron jobs (across all agents)
  ipcMain.handle('crons:listAll', async () => {
    return getAllCronJobs();
  });

  // Get cron jobs for a specific agent
  ipcMain.handle('crons:list', async (_event, agentSlug: string) => {
    return getCronsList(agentSlug);
  });

  // Get a specific cron job
  ipcMain.handle('crons:get', async (_event, agentSlug: string, cronSlug: string) => {
    return getCronConfig(agentSlug, cronSlug);
  });

  // Create a new cron job
  ipcMain.handle('crons:create', async (_event, agentSlug: string, config: Omit<CronJob, 'id'>) => {
    const cronSlug = `cron-${Date.now()}`;
    
    // Create folder
    createCronFolder(agentSlug, cronSlug);
    
    // Create full config with ID and agentSlug
    const fullConfig: CronJob = {
      ...config,
      id: `cron-${Date.now()}`,
      agentSlug,  // Include agentSlug in saved config
      sessionSlug: cronSlug,
    };
    
    // Save config
    const success = saveCronConfig(agentSlug, cronSlug, fullConfig);
    
    return success ? fullConfig : null;
  });

  // Update a cron job
  ipcMain.handle('crons:update', async (_event, agentSlug: string, cronSlug: string, updates: Partial<CronJob>) => {
    const existing = getCronConfig(agentSlug, cronSlug);
    
    if (!existing) {
      return null;
    }
    
    const updated: CronJob = {
      ...existing,
      ...updates,
      id: existing.id,
      agentSlug: existing.agentSlug,
      sessionSlug: existing.sessionSlug,
    };
    
    const success = saveCronConfig(agentSlug, cronSlug, updated);
    
    return success ? updated : null;
  });

  // Toggle cron job enabled/disabled
  ipcMain.handle('crons:toggle', async (_event, agentSlug: string, cronSlug: string, enabled: boolean) => {
    const existing = getCronConfig(agentSlug, cronSlug);
    
    if (!existing) {
      return null;
    }
    
    const updated: CronJob = {
      ...existing,
      enabled,
    };
    
    const success = saveCronConfig(agentSlug, cronSlug, updated);
    
    return success ? updated : null;
  });

  // Delete a cron job
  ipcMain.handle('crons:delete', async (_event, agentSlug: string, cronSlug: string) => {
    return deleteCronConfig(agentSlug, cronSlug);
  });

  // Run a cron job immediately
  ipcMain.handle('crons:runNow', async (_event, agentSlug: string, cronSlug: string) => {
    return await cronService.runNow(agentSlug, cronSlug);
  });

  // Start/stop cron service
  ipcMain.handle('crons:startService', async () => {
    cronService.start();
    return { success: true };
  });

  ipcMain.handle('crons:stopService', async () => {
    cronService.stop();
    return { success: true };
  });

  console.log('Cron IPC handlers registered');
}