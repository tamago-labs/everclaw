import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIContextType {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  sendMessage: (message: string, history?: Message[]) => Promise<string>;
  sendMessageStream: (
    message: string, 
    history: Message[], 
    onToken: (token: string) => void,
    onThinkingToken?: (token: string) => void
  ) => Promise<string>;
  startTime: Date | null;
}

const AIContext = createContext<AIContextType | null>(null);

interface AIProviderProps {
  children: ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Check AI status on mount
  useEffect(() => {
    async function checkAIStatus() {
      try {
        const status = await (window as any).everclawAPI.ai.getStatus();
        setIsReady(status.isReady);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check AI status');
        setIsLoading(false);
      }
    }

    checkAIStatus();

    // Poll status every 5 seconds to update isReady
    const interval = setInterval(async () => {
      try {
        const status = await (window as any).everclawAPI.ai.getStatus();
        
        // Track when AI becomes ready
        if (status.isReady && !isReady) {
          setStartTime(new Date());
        }
        
        setIsReady(status.isReady);
      } catch {
        // Ignore errors during polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isReady]);

  const sendMessage = async (message: string, history: Message[] = []): Promise<string> => {
    try {
      // Convert history to the format expected by backend
      const conversationHistory = history.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const result = await (window as any).everclawAPI.ai.sendPrompt(message, conversationHistory);
      if (result.success && result.response) {
        return result.response;
      } else {
        throw new Error(result.error || 'Failed to get AI response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    }
  };

  const sendMessageStream = useCallback(async (
    message: string, 
    history: Message[], 
    onToken: (token: string) => void,
    onThinkingToken?: (token: string) => void
  ): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      let isStreamComplete = false;
      
      // Create a unique listener for content tokens
      const handleToken = (token: string) => {
        if (isStreamComplete) return; // Ignore tokens after completion
        
        if (token === '') {
          isStreamComplete = true;
          // Remove listeners after completion
          (window as any).everclawAPI.ai.removeStreamTokenListener?.(handleToken);
          (window as any).everclawAPI.ai.removeStreamThinkingListener?.(handleThinking);
        } else {
          onToken(token);
        }
      };
      
      // Create a unique listener for thinking tokens
      const handleThinking = (token: string) => {
        if (isStreamComplete) return;
        
        if (token === '') {
          // Thinking complete
          (window as any).everclawAPI.ai.removeStreamThinkingListener?.(handleThinking);
        } else if (onThinkingToken) {
          onThinkingToken(token);
        }
      };
      
      try {
        // Convert history to the format expected by backend
        const conversationHistory = history.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Register listeners
        (window as any).everclawAPI.ai.onStreamToken(handleToken);
        (window as any).everclawAPI.ai.onStreamThinking(handleThinking);

        const result = await (window as any).everclawAPI.ai.sendPromptStream(message, conversationHistory);
        
        // In case of immediate response (no streaming), cleanup
        isStreamComplete = true;
        (window as any).everclawAPI.ai.removeStreamTokenListener?.(handleToken);
        (window as any).everclawAPI.ai.removeStreamThinkingListener?.(handleThinking);
        
        if (result.success && result.response) {
          resolve(result.response);
        } else {
          reject(new Error(result.error || 'Failed to get AI response'));
        }
      } catch (err) {
        isStreamComplete = true;
        (window as any).everclawAPI.ai.removeStreamTokenListener?.(handleToken);
        (window as any).everclawAPI.ai.removeStreamThinkingListener?.(handleThinking);
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        reject(err);
      }
    });
  }, []);

  return (
    <AIContext.Provider value={{ isLoading, isReady, error, sendMessage, sendMessageStream, startTime }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}