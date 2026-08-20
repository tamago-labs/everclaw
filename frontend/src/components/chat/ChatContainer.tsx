import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { useAI } from '../../context/AIContext'
import ChatHeader from './ChatHeader'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
}

export default function ChatContainer({ sessionId }: { sessionId: string | null }) {
  const { status } = useAI()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingThinking, setStreamingThinking] = useState('')
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const assistantContentRef = useRef('')

  // Connect WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'token') {
          assistantContentRef.current += data.text
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last && last.role === 'assistant') {
              last.content = assistantContentRef.current
            } else {
              updated.push({ id: Date.now().toString(), role: 'assistant', content: assistantContentRef.current })
            }
            return [...updated]
          })
        } else if (data.type === 'thinking') {
          setStreamingThinking((prev) => prev + data.text)
        } else if (data.type === 'done') {
          setStreaming(false)
          setStreamingThinking('')
          assistantContentRef.current = ''
        } else if (data.type === 'error') {
          setError(data.message)
          setStreaming(false)
        }
      } catch {}
    }

    ws.onclose = () => { wsRef.current = null }
    return () => { ws.close() }
  }, [])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingThinking])

  const handleSend = () => {
    if (!input.trim() || streaming) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    assistantContentRef.current = ''
    setStreamingThinking('')
    setError(null)
    setInput('')
    setStreaming(true)

    // Send via WebSocket
    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))
    wsRef.current?.send(JSON.stringify({
      type: 'chat',
      message: userMsg.content,
      sessionId,
      history,
    }))
  }

  const handleNewSession = () => {
    navigate('/sessions')
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader sessionId={sessionId} onNewSession={handleNewSession} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="icon-glow w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Bot size={24} className="text-white/50 relative z-10" />
            </div>
            <p className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Start a conversation</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Ask me anything!</p>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: msg.role === 'user' ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.1)',
              }}
            >
              {msg.role === 'user'
                ? <User size={16} className="text-[#0F1117]" />
                : <Bot size={16} className="text-white/70" />
              }
            </div>

            {/* Bubble */}
            <div
              className="rounded-2xl px-4 py-3 max-w-[80%]"
              style={{
                background: msg.role === 'user' ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.05)',
                color: msg.role === 'user' ? '#0F1117' : 'var(--color-text-primary)',
              }}
            >
              <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
            </div>
          </motion.div>
        ))}

        {/* Streaming thinking */}
        {streamingThinking && (
          <div className="ml-11">
            <div
              className="rounded-xl p-3 text-xs italic whitespace-pre-wrap"
              style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'rgba(251, 191, 36, 0.8)' }}
            >
              {streamingThinking}
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {streaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <Bot size={16} className="text-white/70" />
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />
            </div>
          </div>
        )}

        {error && (
          <div className="ml-11 p-3 rounded-xl text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171' }}>
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4" style={{ borderTop: '1px solid var(--color-border-default)' }}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend() }}
          className="flex items-center overflow-hidden rounded-xl"
          style={{ border: '1px solid var(--color-border-default)' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={streaming}
            className="flex-1 px-4 py-3 text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--color-text-primary)',
              opacity: streaming ? 0.5 : 1,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="px-4 py-3 transition-all"
            style={{
              background: 'var(--color-accent-primary)',
              color: '#0F1117',
              opacity: !input.trim() || streaming ? 0.4 : 1,
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
