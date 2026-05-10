import { 
  getAllCronJobs, 
  saveCronConfig, 
  logCronExecution, 
  type CronJob 
} from './storage';
import { createSessionFolder } from '../sessions/storage';
import { saveMessages, loadMessages } from '../sessions/storage';
import { executeAiCompletion, isModelReady } from '../aiService';
import { log as logService } from '../logs';

// Simple cron expression parser
// Format: minute hour day month weekday
// * = any, numbers = specific value
function parseCronExpression(schedule: string): { minute: number[]; hour: number[]; day: number[]; month: number[]; weekday: number[] } {
  const parts = schedule.split(' ');
  if (parts.length !== 5) {
    return { minute: [], hour: [], day: [], month: [], weekday: [] };
  }

  const parseField = (value: string, max: number): number[] => {
    if (value === '*') {
      return Array.from({ length: max + 1 }, (_, i) => i);
    }
    
    // Handle step values like */15
    if (value.startsWith('*/')) {
      const step = parseInt(value.slice(2));
      return Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
    }
    
    // Handle lists like 1,15
    if (value.includes(',')) {
      return value.split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n));
    }
    
    // Handle ranges like 1-5
    if (value.includes('-')) {
      const [start, end] = value.split('-').map(v => parseInt(v));
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
    
    const num = parseInt(value);
    return isNaN(num) ? [] : [num];
  };

  return {
    minute: parseField(parts[0], 59),
    hour: parseField(parts[1], 23),
    day: parseField(parts[2], 31),
    month: parseField(parts[3], 12),
    weekday: parseField(parts[4], 6),
  };
}

function shouldRunNow(schedule: string): boolean {
  const now = new Date();
  const parsed = parseCronExpression(schedule);
  
  // Check each field
  if (!parsed.minute.includes(now.getMinutes())) return false;
  if (!parsed.hour.includes(now.getHours())) return false;
  if (!parsed.day.includes(now.getDate())) return false;
  if (!parsed.month.includes(now.getMonth() + 1)) return false;
  if (!parsed.weekday.includes(now.getDay())) return false;
  
  return true;
}

function getNextRunTime(schedule: string): Date {
  const now = new Date();
  const parsed = parseCronExpression(schedule);
  
  // Simple implementation: check next 60 minutes
  for (let i = 1; i <= 60; i++) {
    const checkTime = new Date(now.getTime() + i * 60000);
    
    if (parsed.minute.includes(checkTime.getMinutes()) &&
        parsed.hour.includes(checkTime.getHours()) &&
        parsed.day.includes(checkTime.getDate()) &&
        parsed.month.includes(checkTime.getMonth() + 1) &&
        parsed.weekday.includes(checkTime.getDay())) {
      return checkTime;
    }
  }
  
  // Return tomorrow if no match found
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

// AI execution function (non-streaming)
async function executeCronJob(cron: CronJob): Promise<string> {
  try {
    // Create session for this cron if not exists
    createSessionFolder(cron.agentSlug, cron.sessionSlug);
    
    // Load existing messages from session
    const messages = loadMessages(cron.agentSlug, cron.sessionSlug);
    
    // Execute AI completion (non-streaming) with agent's system prompt
    const result = await executeAiCompletion(cron.prompt, messages, cron.agentSlug);
    
    if (!result.success) {
      throw new Error(result.error || 'AI execution failed');
    }
    
    return result.response;
  } catch (error) {
    throw error;
  }
}

class CronService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logService('[CronService] Started');
    
    // Check every 60 seconds
    this.intervalId = setInterval(() => {
      this.checkAndRunCrons();
    }, 60000);
    
    // Also run immediately on start
    this.checkAndRunCrons();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logService('[CronService] Stopped');
  }

  private async checkAndRunCrons(): Promise<void> {
    // Skip if model not ready
    if (!isModelReady()) {
      logService('[CronService] Skipping - AI model not ready');
      return;
    }
    
    try {
      const allCrons = getAllCronJobs();
      
      for (const cron of allCrons) {
        if (!cron.enabled) continue;
        
        if (shouldRunNow(cron.schedule)) {
          await this.runCronJob(cron);
        }
      }
    } catch (error) {
      logService(`[CronService] Check error: ${error}`);
    }
  }

  async runCronJob(cron: CronJob): Promise<{ success: boolean; response?: string; error?: string }> {
    logService(`[CronService] Running "${cron.name}"`);
    
    try {
      const response = await executeCronJob(cron);
      
      // Update lastRun and nextRun
      const now = new Date();
      const updatedCron: CronJob = {
        ...cron,
        lastRun: now.toISOString(),
        nextRun: getNextRunTime(cron.schedule).toISOString(),
      };
      saveCronConfig(cron.agentSlug, cron.sessionSlug, updatedCron);
      
      // Log to execution log
      logCronExecution(cron.agentSlug, cron.sessionSlug, {
        success: true,
        response,
      });
      
      // Save to session messages with timestamp
      const messages = loadMessages(cron.agentSlug, cron.sessionSlug);
      const timestamp = now.toISOString();
      messages.push(
        { role: 'user', content: cron.prompt },
        { role: 'assistant', content: `[${timestamp}] ${response}` }
      );
      saveMessages(cron.agentSlug, cron.sessionSlug, messages);
      
      logService(`[CronService] "${cron.name}" completed successfully`);
      
      return { success: true, response };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      logCronExecution(cron.agentSlug, cron.sessionSlug, {
        success: false,
        error: errorMsg,
      });
      
      // Update lastRun but no nextRun (error)
      const now = new Date();
      const updatedCron: CronJob = {
        ...cron,
        lastRun: now.toISOString(),
      };
      saveCronConfig(cron.agentSlug, cron.sessionSlug, updatedCron);
      
      logService(`[CronService] "${cron.name}" failed: ${errorMsg}`);
      
      return { success: false, error: errorMsg };
    }
  }

  // Run a specific cron job immediately
  async runNow(agentSlug: string, cronSlug: string): Promise<{ success: boolean; response?: string; error?: string }> {
    const crons = getAllCronJobs().filter(c => c.agentSlug === agentSlug && c.sessionSlug === cronSlug);
    
    if (crons.length === 0) {
      return { success: false, error: 'Cron job not found' };
    }
    
    return this.runCronJob(crons[0]);
  }
}

// Export singleton instance
export const cronService = new CronService();