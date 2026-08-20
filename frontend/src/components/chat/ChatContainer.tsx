import { useState, useRef, useEffect, Fragment } from 'react'
import { motion } from 'framer-motion'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { getSession, clearSessionMessages } from '../../api'
import ChatHeader from './ChatHeader'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
}

interface Props {
  sessionId: string | null
  onSessionChange: (id: string) => void
}

export default function ChatContainer({ sessionId, onSessionChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingThinking, setStreamingThinking] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const assistantContentRef = useRef('')
  const sessionIdRef = useRef(sessionId)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mountedRef = useRef(true)

  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])

  // Load messages when session changes
  useEffect(() => {
    if (sessionId) {
      getSession(sessionId).then((r) => {
        setMessages(r.messages)
        setStreamingThinking('')
        setError(null)
      }).catch(() => setMessages([]))
    } else {
      setMessages([])
    }
  }, [sessionId])

  // WebSocket with auto-reconnect
  useEffect(() => {
    mountedRef.current = true

    function connect() {
      if (!mountedRef.current) return

      const wsHost = import.meta.env.DEV ? 'localhost:3001' : window.location.host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${wsHost}/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WS connected')
        setWsConnected(true)
      }

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

      ws.onclose = () => {
        console.log('WS disconnected, reconnecting in 2s...')
        setWsConnected(false)
        wsRef.current = null
        if (mountedRef.current) {
          reconnectTimer.current = setTimeout(connect, 2000)
        }
      }

      ws.onerror = () => {
        // onclose will handle reconnect
      }
    }

    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
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

    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }))
    wsRef.current?.send(JSON.stringify({
      type: 'chat',
      message: userMsg.content,
      sessionId: sessionIdRef.current,
      history,
    }))
  }

  const handleClear = async () => {
    const id = sessionIdRef.current
    if (!id) return
    try {
      await clearSessionMessages(id)
      setMessages([])
      setStreamingThinking('')
      setError(null)
      assistantContentRef.current = ''
    } catch (err: any) {
      setError(err.message || 'Failed to clear conversation')
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 0px)' }}>
      <ChatHeader sessionId={sessionId} onSessionChange={onSessionChange} onClear={handleClear} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="icon-glow w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--color-bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Bot size={24} className="text-white/50 relative z-10" />
            </div>
            <p className="text-lg font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Start a conversation</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Ask me anything!</p>
            {!wsConnected && (
              <p className="text-xs mt-2" style={{ color: 'rgba(245,158,11,0.8)' }}>Connecting to server...</p>
            )}
          </div>
        )}

        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1
          const showThinking = streaming && streamingThinking && isLast

          return (
            <Fragment key={msg.id}>
              {showThinking && (
                <div className="ml-11">
                  <div
                    className="rounded-xl p-3 text-xs italic whitespace-pre-wrap"
                    style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'rgba(251, 191, 36, 0.8)' }}
                  >
                    {streamingThinking}
                  </div>
                </div>
              )}
              <motion.div
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: msg.role === 'user' ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.1)' }}
                >
                  {msg.role === 'user'
                    ? <User size={16} className="text-[#0F1117]" />
                    : <Bot size={16} className="text-white/70" />
                  }
                </div>
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
            </Fragment>
          )
        })}

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
            placeholder={wsConnected ? 'Type your message...' : 'Connecting...'}
            disabled={streaming || !wsConnected}
            className="flex-1 px-4 py-3 text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--color-text-primary)',
              opacity: streaming ? 0.5 : 1,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming || !wsConnected}
            className="px-4 py-3 transition-all"
            style={{
              background: 'var(--color-accent-primary)',
              color: '#0F1117',
              opacity: !input.trim() || streaming || !wsConnected ? 0.4 : 1,
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
