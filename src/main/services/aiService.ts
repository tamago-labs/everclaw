import { 
  completion,
  type ToolCall
} from '@qvac/sdk';
import { getEnabledTools, executeTool } from './tools';
import { compileSystemPrompt } from './agents/promptBuilder';
import { log as logService } from './logs';

// Reference to model ID (set when model is loaded)
let modelId: string | null = null;

export function setModelId(id: string | null): void {
  modelId = id;
}

export function getModelId(): string | null {
  return modelId;
}

export function isModelReady(): boolean {
  return modelId !== null;
}

/**
 * Execute AI completion with tools (non-streaming, for cron jobs)
 */
export async function executeAiCompletion(
  message: string,
  history: { role: string; content: string }[],
  agentSlug?: string
): Promise<{ success: boolean; response: string; error?: string }> {
  if (!modelId) {
    return { success: false, response: '', error: 'AI model not loaded' };
  }

  try {
    // Compile system prompt if agentSlug provided
    let finalHistory = history;
    if (agentSlug) {
      const systemPrompt = await compileSystemPrompt(agentSlug);
      finalHistory = [{ role: 'system', content: systemPrompt }, ...history];
    }

    // Build conversation history
    const conversationHistory = [...finalHistory, { role: 'user', content: message }];

    let fullResponse = '';
    const maxToolCalls = 5;
    let toolCallCount = 0;

    while (toolCallCount < maxToolCalls) {
      const result = completion({
        modelId: modelId,
        history: conversationHistory,
        stream: false, 
        kvCache: true,
        captureThinking: false, 
        tools: getEnabledTools() as any
      });

      // Get full text (non-streaming)
      let fullText = await result.text;
      
      // Remove thinking tags if present
      fullText = fullText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      
      fullResponse += fullText;

      // Get tool calls from result
      const toolCalls: ToolCall[] = await result.toolCalls;

      if (toolCalls.length === 0) {
        break;
      }

      toolCallCount++;

      // Log tool calls
      for (const call of toolCalls) {
        console.log(`[Cron] Tool: ${call.name}(${JSON.stringify(call.arguments)})`);
        logService(`[Cron] ${call.name}(${JSON.stringify(call.arguments)})`);
      }

      // Execute tool calls
      console.log("[Cron] Executing tool calls...");
      const toolResults = await Promise.all(toolCalls.map(async (call) => {
        const result = await executeTool(call.name, call.arguments as Record<string, unknown>);
        console.log(`  ✓ ${call.name}`);
        return { toolCallId: call.id, result };
      }));

      // Add tool results to history
      for (const toolResult of toolResults) {
        conversationHistory.push({
          role: "tool",
          content: toolResult.result,
        });
      }
    }

    return { success: true, response: fullResponse, error: undefined };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, response: '', error: errorMsg };
  }
}