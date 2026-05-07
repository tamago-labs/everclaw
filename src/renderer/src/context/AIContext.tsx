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
  sendMessageStream: (message: string, history: Message[], onToken: (token: string) => void) => Promise<string>;
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
    onToken: (token: string) => void
  ): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Convert history to the format expected by backend
        const conversationHistory = history.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Listen for stream tokens
        (window as any).everclawAPI.ai.onStreamToken((token: string) => {
          if (token === '') {
            // Stream complete
          } else {
            onToken(token);
          }
        });

        const result = await (window as any).everclawAPI.ai.sendPromptStream(message, conversationHistory);
        if (result.success && result.response) {
          resolve(result.response);
        } else {
          reject(new Error(result.error || 'Failed to get AI response'));
        }
      } catch (err) {
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