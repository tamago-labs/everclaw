// System Prompt Builder - Compiles agent files into final system prompt

import { readWorkspaceFile } from './storage';
// import { getToolInfo } from '../tools';

// interface ToolInfo {
//   name: string;
//   description: string;
//   parameters: Record<string, { type: string; description?: string; required: boolean }>;
// }

/**
 * Compile workspace files into system prompt
 * Combines: context.md + core.md + identity.md + tools summary
 */
export async function compileSystemPrompt(slug: string): Promise<string> {
  // Read workspace files
  const [identity, core, context] = await Promise.all([
    readWorkspaceFile(slug, 'identity.md'),
    readWorkspaceFile(slug, 'core.md'),
    readWorkspaceFile(slug, 'context.md'),
  ]);

  // Get tools summary from enabled tools
  // const tools = getToolInfo();
  // const toolsSummary = buildToolsSummary(tools);

  // Compile final prompt with sections
  const sections = [
    '=== CONTEXT ===',
    context || '',
    '',
    '=== CORE ===',
    core || getDefaultCore(),
    '',
    '=== IDENTITY ===',
    identity || getDefaultIdentity(),
    '',
    // '=== TOOLS ===',
    // toolsSummary,
  ];

  return sections.join('\n');
}

/**
 * Build compact tools summary for local models
 */
// function buildToolsSummary(tools: ToolInfo[]): string {
//   if (tools.length === 0) {
//     return 'No tools enabled.';
//   }

//   const lines = ['Tools available:', ''];

//   for (const tool of tools) {
//     const params = Object.entries(tool.parameters)
//       .map(([key, param]) => `- ${key}: ${param.type}${param.required ? ' (required)' : ''}`)
//       .join('\n');

//     lines.push(`Tool: ${tool.name}`);
//     lines.push(`Description: ${tool.description}`);
//     if (params) {
//       lines.push('Arguments:');
//       lines.push(params);
//     }
//     lines.push('');
//   }

//   return lines.join('\n');
// }

/**
 * Get default core.md content
 */
function getDefaultCore(): string {
  return `# Core Runtime

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
- Never call unavailable tools`;
}

/**
 * Get default identity.md content
 */
function getDefaultIdentity(): string {
  return `# Identity

Name:
Agent

Role:
Personal assistant

Behavior:
- Concise
- Helpful
- Accurate`;
}
