import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AIContextType {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<string>;
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

  const sendMessage = async (message: string): Promise<string> => {
    try {
      const result = await (window as any).everclawAPI.ai.sendPrompt(message);
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

  return (
    <AIContext.Provider value={{ isLoading, isReady, error, sendMessage, startTime }}>
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