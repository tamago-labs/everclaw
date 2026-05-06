import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import PageWrapper from '../components/common/PageWrapper';
import { useAI } from '../context/AIContext';
import { useTheme } from '../context/ThemeContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const { isLoading, isReady, error, sendMessage } = useAI();
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    try {
      // Add placeholder for assistant message
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

      // Send message and get response (non-streaming from main process)
      const response = await sendMessage(userMessage.content);
      
      // Update assistant message with response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: response }
            : msg
        )
      );
    } catch (err) {
      console.error('Failed to get response:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
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
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Loading AI model...
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
        <div className={`relative overflow-hidden rounded-2xl ${
          isDark ? 'border border-white/10' : 'border border-black/5 shadow-lg'
        }`}
        style={{
          background: isDark ? 'rgba(26, 29, 46, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          height: 'calc(100vh - 280px)',
          minHeight: '400px',
        }}>
          {/* Glass effects */}
          <div className={`absolute inset-0 rounded-2xl ${
            isDark ? 'bg-gradient-to-br from-white/5 to-transparent' : 'bg-gradient-to-br from-white/80 to-transparent'
          }`} />
          <div className={`absolute top-0 left-0 w-full h-px ${
            isDark ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
          }`} />

          <div className="relative z-10 flex flex-col h-full">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="w-12 h-12 text-gray-500 mb-4" />
                  <p className={`text-lg font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Start a conversation
                  </p>
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Ask me anything!
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-accent-primary'
                      : isDark ? 'bg-white/10' : 'bg-gray-200'
                  }`}>
                    {message.role === 'user' ? (
                      <User size={16} className="text-[#0F1117]" />
                    ) : (
                      <Bot size={16} className={isDark ? 'text-white' : 'text-gray-700'} />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-accent-primary text-[#0F1117]'
                      : isDark ? 'bg-white/5' : 'bg-gray-100'
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              ))}

              {isGenerating && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-white/10' : 'bg-gray-200'
                  }`}>
                    <Bot size={16} className={isDark ? 'text-white' : 'text-gray-700'} />
                  </div>
                  <div className={`px-4 py-2 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-black/5'}`}>
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isGenerating}
                  className={`flex-1 px-4 py-3 rounded-xl outline-none transition-colors ${
                    isDark
                      ? 'bg-white/5 text-white placeholder-gray-500 focus:bg-white/10'
                      : 'bg-gray-100 text-gray-900 placeholder-gray-400 focus:bg-gray-200'
                  } ${isGenerating ? 'opacity-50' : ''}`}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isGenerating}
                  className="px-4 py-3 rounded-xl bg-accent-primary text-[#0F1117] font-semibold hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}