import { useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContainerProps {
  messages: Message[];
  input: string;
  isGenerating: boolean;
  isMCPRunning: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function ChatContainer({ 
  messages, 
  input, 
  isGenerating, 
  isMCPRunning,
  onInputChange, 
  onSubmit 
}: ChatContainerProps) {
  const { isDark } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${
        isDark ? 'border border-white/10' : 'border border-black/5 shadow-lg'
      }`}
      style={{
        background: isDark ? 'rgba(26, 29, 46, 0.6)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        height: 'calc(100vh - 280px)',
        minHeight: '400px',
      }}
    >
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

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-black/5'}`}>
          <form onSubmit={onSubmit} className="flex gap-0">
            {/* MCP Status Indicator */}
            <div 
              className={`px-3 py-3 rounded-l-xl border-r flex items-center gap-2 ${
                isDark 
                  ? 'bg-white/5 border-white/10' 
                  : 'bg-gray-100 border-black/5'
              }`}
              title={isMCPRunning ? 'MCP Server Running' : 'MCP Server Stopped'}
            >
              <div className={`w-2 h-2 rounded-full ${
                isMCPRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
              }`} />
              <span className={`text-xs font-medium ${
                isDark ? 'text-white/70' : 'text-gray-600'
              }`}>
                {isMCPRunning ? 'MCP Ready' : 'MCP Off'}
              </span>
            </div>
            
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Type your message..."
              disabled={isGenerating}
              className={`flex-1 px-4 py-3 outline-none transition-colors ${
                isDark
                  ? 'bg-white/5 text-white placeholder-gray-500 focus:bg-white/10'
                  : 'bg-gray-100 text-gray-900 placeholder-gray-400 focus:bg-gray-200'
              } ${isGenerating ? 'opacity-50' : ''}`}
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="px-4 py-3 rounded-r-xl bg-accent-primary text-[#0F1117] font-semibold hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}