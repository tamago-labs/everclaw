import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import PageWrapper from '../components/common/PageWrapper';
import ChatContainer from '../components/chat/ChatContainer';
import ChatHeader from '../components/chat/ChatHeader';
import { useAI } from '../context/AIContext';
import { useTheme } from '../context/ThemeContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const { isLoading, isReady, error, sendMessageStream } = useAI();
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('main');
  const [selectedSession, setSelectedSession] = useState('main');

  // Load messages when agent/session changes
  useEffect(() => {
    if (!selectedAgent || !selectedSession) return;

    async function loadMessages() {
      try {
        const storedMessages: any[] = await (window as any).everclawAPI.sessions.loadMessages(selectedAgent, selectedSession);
        
        // Convert stored messages to Message format
        const formattedMessages: Message[] = storedMessages.map((msg, index) => ({
          id: msg.id || `msg-${index}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        }));
        
        setMessages(formattedMessages);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    }

    loadMessages();
  }, [selectedAgent, selectedSession]);

  // Save messages when they change
  useEffect(() => {
    if (!selectedAgent || !selectedSession || messages.length === 0) return;

    const saveTimeout = setTimeout(async () => {
      try {
        // Convert messages to storable format
        const messagesToSave = messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
        }));
        
        await (window as any).everclawAPI.sessions.saveMessages(selectedAgent, selectedSession, messagesToSave);
      } catch (error) {
        console.error('Failed to save messages:', error);
      }
    }, 500); // Debounce saves

    return () => clearTimeout(saveTimeout);
  }, [messages, selectedAgent, selectedSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating || !isReady) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    // Create placeholder for assistant response
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);

    // Get messages before this new one for conversation history (exclude the empty assistant message)
    const conversationHistory = messages;

    try {
      await sendMessageStream(userMessage.content, conversationHistory, (token) => {
        // Update the last message with the streamed token
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + token }
              : msg
          )
        );
      });
    } catch (err) {
      console.error('Failed to get response:', err);
      // Update the failed message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <PageWrapper title="Chat">
      {/* Loading State */}
      {(isLoading || !isReady) && (
        <div className={`flex flex-col items-center justify-center h-96 rounded-2xl ${
          isDark ? 'border border-white/10' : 'border border-black/5 shadow-lg'
        }`}
        style={{
          background: isDark ? 'rgba(26, 29, 46, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          <Loader2 className="w-8 h-8 animate-spin text-accent-primary mb-4" />
          <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Preparing AI...<br />
            <span className="text-sm">(2-3 min, longer on first run)</span>
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className={`p-4 rounded-2xl mb-4 border ${
          isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
        }`}>
          <p className={isDark ? 'text-red-400' : 'text-red-600'}>
            Error: {error}
          </p>
        </div>
      )}

      {/* Chat Interface */}
      {isReady && (
        <>
          <ChatHeader
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
            selectedSession={selectedSession}
            onSessionChange={setSelectedSession}
          />
          <ChatContainer
            messages={messages}
            input={input}
            isGenerating={isGenerating}
            onInputChange={setInput}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </PageWrapper>
  );
}