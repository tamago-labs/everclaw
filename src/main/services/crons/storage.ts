import * as fs from 'fs';
import * as path from 'path';
import { getAgentsPath } from '../agents/storage';

const CRONS_DIR = 'crons';

export interface CronJob {
  id: string;
  name: string;
  agentSlug: string;
  sessionSlug: string;
  prompt: string;
  schedule: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

export function getCronsPath(agentSlug: string): string {
  return path.join(getAgentsPath(), agentSlug, CRONS_DIR);
}

export function getCronPath(agentSlug: string, cronSlug: string): string {
  return path.join(getCronsPath(agentSlug), cronSlug);
}

export function createCronFolder(agentSlug: string, cronSlug: string): string {
  const cronPath = getCronPath(agentSlug, cronSlug);
  fs.mkdirSync(cronPath, { recursive: true });
  return cronPath;
}

export function deleteCronFolder(agentSlug: string, cronSlug: string): boolean {
  const cronPath = getCronPath(agentSlug, cronSlug);
  if (fs.existsSync(cronPath)) {
    fs.rmSync(cronPath, { recursive: true, force: true });
    return true;
  }
  return false;
}

export function getCronsList(agentSlug: string): CronJob[] {
  const cronsPath = getCronsPath(agentSlug);
  
  if (!fs.existsSync(cronsPath)) {
    return [];
  }
  
  const entries = fs.readdirSync(cronsPath, { withFileTypes: true });
  const crons: CronJob[] = [];
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const cronSlug = entry.name;
      const configPath = path.join(cronsPath, cronSlug, 'config.json');
      // const logsPath = path.join(cronsPath, cronSlug, 'logs');
      
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          crons.push(config);
        } catch {
          // Skip invalid config
        }
      }
    }
  }
  
  return crons;
}

export function getCronConfig(agentSlug: string, cronSlug: string): CronJob | null {
  const configPath = path.join(getCronPath(agentSlug, cronSlug), 'config.json');
  
  if (!fs.existsSync(configPath)) {
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveCronConfig(agentSlug: string, cronSlug: string, config: CronJob): boolean {
  const configPath = path.join(getCronPath(agentSlug, cronSlug), 'config.json');
  
  try {
    // Ensure directory exists
    const cronPath = getCronPath(agentSlug, cronSlug);
    if (!fs.existsSync(cronPath)) {
      fs.mkdirSync(cronPath, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch {
    return false;
  }
}

export function deleteCronConfig(agentSlug: string, cronSlug: string): boolean {
  return deleteCronFolder(agentSlug, cronSlug);
}

// Get all cron jobs across all agents
export function getAllCronJobs(): CronJob[] {
  const agentsPath = getAgentsPath();
  
  if (!fs.existsSync(agentsPath)) {
    return [];
  }
  
  const agentDirs = fs.readdirSync(agentsPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
  
  const allCrons: CronJob[] = [];
  
  for (const agentSlug of agentDirs) {
    const crons = getCronsList(agentSlug);
    allCrons.push(...crons);
  }
  
  return allCrons;
}

// Log execution to cron job's logs directory
export function logCronExecution(
  agentSlug: string, 
  cronSlug: string, 
  result: { success: boolean; response?: string; error?: string }
): void {
  const logsPath = path.join(getCronPath(agentSlug, cronSlug), 'logs');
  
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
  }
  
  const logFile = path.join(logsPath, `${Date.now()}.json`);
  fs.writeFileSync(logFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    ...result
  }, null, 2));
}