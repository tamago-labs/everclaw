import * as fs from 'fs';
import * as path from 'path';
import { getAgentsPath, getAgentsList } from '../agents/storage';

const SESSIONS_DIR = 'sessions';

export { getAgentsList };

export function getSessionsPath(agentSlug: string): string {
  return path.join(getAgentsPath(), agentSlug, SESSIONS_DIR);
}

export function createSessionFolder(agentSlug: string, sessionSlug: string): { path: string; messagesPath: string } {
  const basePath = path.join(getSessionsPath(agentSlug), sessionSlug);
  const messagesPath = path.join(basePath, 'messages.json');

  fs.mkdirSync(basePath, { recursive: true });

  // Initialize empty messages file
  fs.writeFileSync(messagesPath, JSON.stringify([]));

  return { path: basePath, messagesPath };
}

export function deleteSessionFolder(agentSlug: string, sessionSlug: string): boolean {
  const basePath = path.join(getSessionsPath(agentSlug), sessionSlug);
  
  if (fs.existsSync(basePath)) {
    fs.rmSync(basePath, { recursive: true, force: true });
    return true;
  }
  
  return false;
}

export function getSessionsList(agentSlug: string): string[] {
  const sessionsPath = getSessionsPath(agentSlug);
  
  if (!fs.existsSync(sessionsPath)) {
    return [];
  }
  
  const entries = fs.readdirSync(sessionsPath, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}

export function sessionExists(agentSlug: string, sessionSlug: string): boolean {
  const sessionPath = path.join(getSessionsPath(agentSlug), sessionSlug);
  return fs.existsSync(sessionPath);
}

export function ensureMainSession(agentSlug: string): void {
  const mainSessionSlug = 'main';
  
  if (!sessionExists(agentSlug, mainSessionSlug)) {
    createSessionFolder(agentSlug, mainSessionSlug);
  }
}

export function saveMessages(agentSlug: string, sessionSlug: string, messages: any[]): void {
  const messagesPath = path.join(getSessionsPath(agentSlug), sessionSlug, 'messages.json');
  fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
}

export function loadMessages(agentSlug: string, sessionSlug: string): any[] {
  const messagesPath = path.join(getSessionsPath(agentSlug), sessionSlug, 'messages.json');
  
  if (!fs.existsSync(messagesPath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(messagesPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export function getSessionMetadata(agentSlug: string, sessionSlug: string): { created: Date; lastActive: Date } | null {
  const sessionPath = path.join(getSessionsPath(agentSlug), sessionSlug);
  
  if (!fs.existsSync(sessionPath)) {
    return null;
  }
  
  try {
    const stats = fs.statSync(sessionPath);
    const messagesPath = path.join(sessionPath, 'messages.json');
    
    let lastActive = stats.ctime;
    if (fs.existsSync(messagesPath)) {
      const msgStats = fs.statSync(messagesPath);
      lastActive = msgStats.mtime;
    }
    
    return {
      created: stats.birthtime,
      lastActive: lastActive,
    };
  } catch {
    return null;
  }
}