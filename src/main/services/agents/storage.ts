import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const AGENTS_DIR = 'agents';

export function getAgentsPath(): string {
  return path.join(app.getPath('userData'), AGENTS_DIR);
}

export function createAgentFolder(slug: string): { path: string; sessionsPath: string; workspacesPath: string } {
  const basePath = path.join(getAgentsPath(), slug);
  const sessionsPath = path.join(basePath, 'sessions');
  const workspacesPath = path.join(basePath, 'workspaces');

  fs.mkdirSync(basePath, { recursive: true });
  fs.mkdirSync(sessionsPath, { recursive: true });
  fs.mkdirSync(workspacesPath, { recursive: true });

  return { path: basePath, sessionsPath, workspacesPath };
}

export function deleteAgentFolder(slug: string): boolean {
  const basePath = path.join(getAgentsPath(), slug);
  
  if (fs.existsSync(basePath)) {
    fs.rmSync(basePath, { recursive: true, force: true });
    return true;
  }
  
  return false;
}

export function getAgentsList(): string[] {
  const agentsPath = getAgentsPath();
  
  if (!fs.existsSync(agentsPath)) {
    return [];
  }
  
  const entries = fs.readdirSync(agentsPath, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}

export function agentExists(slug: string): boolean {
  const agentPath = path.join(getAgentsPath(), slug);
  return fs.existsSync(agentPath);
}

export function getAgentInfo(slug: string): { slug: string; sessionsCount: number; workspacesCount: number } | null {
  const basePath = path.join(getAgentsPath(), slug);
  
  if (!fs.existsSync(basePath)) {
    return null;
  }
  
  const sessionsPath = path.join(basePath, 'sessions');
  const workspacesPath = path.join(basePath, 'workspaces');
  
  const sessionsCount = fs.existsSync(sessionsPath) 
    ? fs.readdirSync(sessionsPath).filter(f => fs.statSync(path.join(sessionsPath, f)).isDirectory()).length
    : 0;
    
  const workspacesCount = fs.existsSync(workspacesPath)
    ? fs.readdirSync(workspacesPath).filter(f => fs.statSync(path.join(workspacesPath, f)).isDirectory()).length
    : 0;
  
  return { slug, sessionsCount, workspacesCount };
}

export function ensureMainAgent(): void {
  const mainAgentSlug = 'main';
  
  if (!agentExists(mainAgentSlug)) {
    createAgentFolder(mainAgentSlug);
  }
}
