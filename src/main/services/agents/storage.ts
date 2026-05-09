import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const AGENTS_DIR = 'agents';

// Workspace file templates
const TEMPLATES = {
  'identity.md': `# Identity

Name:
My Agent

Role:
Personal assistant

Behavior:
- Concise
- Helpful
- Accurate

Expertise:
- General tasks
`,

  'core.md': `# Core Runtime

Rules:
- Be concise and accurate
- Never invent tool outputs
- Use tools when needed
- If a tool is required, do not guess
- Ask for confirmation before irreversible actions
- If unsure, explain uncertainty clearly

Wallet:
- When user asks about wallet address, use get_address tool or read from context
- Never ask user for wallet address if it's in context

Tool Calling:
- Output tool calls only in the required format
- Never modify tool schemas
- Never call unavailable tools
`,

  'context.md': `# Context

Current Chain:
unknown

Connected Wallet:
none

Recent Actions:
- None
`,
};

export function getAgentsPath(): string {
  return path.join(app.getPath('userData'), AGENTS_DIR);
}

export function getWorkspacePath(slug: string): string {
  return path.join(getAgentsPath(), slug, 'workspaces');
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
    initWorkspaceFiles(mainAgentSlug);
  }
}

// Workspace file functions
export function initWorkspaceFiles(slug: string): void {
  const workspacePath = getWorkspacePath(slug);
  
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }
  
  // Create default files if missing
  for (const [filename, content] of Object.entries(TEMPLATES)) {
    const filePath = path.join(workspacePath, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }
}

export function getWorkspaceFiles(slug: string): string[] {
  const workspacePath = getWorkspacePath(slug);
  
  if (!fs.existsSync(workspacePath)) {
    return [];
  }
  
  return fs.readdirSync(workspacePath)
    .filter(f => f.endsWith('.md'))
    .sort();
}

export function readWorkspaceFile(slug: string, filename: string): string | null {
  const filePath = path.join(getWorkspacePath(slug), filename);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export function writeWorkspaceFile(slug: string, filename: string, content: string): boolean {
  const filePath = path.join(getWorkspacePath(slug), filename);
  
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}