import { useState, useRef, useEffect, Fragment } from 'react'
import { motion } from 'framer-motion'
import { Send, Bot, User, Loader2, X } from 'lucide-react'
import { getSession, fetchAgents, runKane, summarizeKane, saveSessionMessages, type Agent } from '../../api'
import ChatHeader from './ChatHeader'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  kaneMeta?: any
}

interface Props {
  sessionId: string | null
  agentId?: string | null
  onSessionChange: (id: string) => void
  onAgentClear?: () => void
}

export default function ChatContainer({ sessionId, agentId, onSessionChange, onAgentClear }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingThinking, setStreamingThinking] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [kaneRunning, setKaneRunning] = useState(false)
  const [showKaneUrlModal, setShowKaneUrlModal] = useState(false)
  const [kanePendingObjective, setKanePendingObjective] = useState<string | null>(null)
  const [kaneUrlInput, setKaneUrlInput] = useState('http://localhost:3001')
  const [agent, setAgent] = useState<Agent | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const assistantContentRef = useRef('')
  const sessionIdRef = useRef(sessionId)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mountedRef = useRef(true)

  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])

  useEffect(() => {
    if (!agentId) { setAgent(null); return }
    fetchAgents().then((r) => setAgent(r.agents.find((a) => a.id === agentId) || null)).catch(() => setAgent(null))
  }, [agentId])

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

  const executeKane = async (objective: string, url: string, userRaw: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userRaw }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setError(null)
    setKaneRunning(true)
    // Show raw card immediately, then update with human summary
    const tempId = (Date.now() + 1).toString()
    try {
      const runEnd = await runKane(objective, url)
      const rawSummary = runEnd.summary || runEnd.one_liner || 'Kane run completed'
      const tempMsg: Message = { id: tempId, role: 'assistant', content: rawSummary, kaneMeta: runEnd }
      setMessages((prev) => {
        const next = [...prev, tempMsg]
        if (sessionIdRef.current) saveSessionMessages(sessionIdRef.current, next as any).catch(() => {})
        return next
      })
      // One-shot JSON -> human (no persona/session) via /api/ai/summarize
      let human = rawSummary
      try {
        const s = await summarizeKane(runEnd)
        human = s.text.replace(/<think>[\s\S]*?<\/think>/g, '').trim() || rawSummary
      } catch {}
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === tempId ? { ...m, content: human } : m))
        if (sessionIdRef.current) saveSessionMessages(sessionIdRef.current, next as any).catch(() => {})
        return next
      })
    } catch (e: any) {
      setError(e.message || 'Kane run failed')
    } finally {
      setKaneRunning(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || streaming || kaneRunning) return

    const raw = input.trim()

    // Slash /kane → show URL modal first (default localhost:3001, auto-extract URL from objective if present)
    if (raw.startsWith('/kane ')) {
      const kaneObjective = raw.slice(6).trim()
      if (!kaneObjective) return
      const urlMatch = kaneObjective.match(/https?:\/\/[^\s]+/) || kaneObjective.match(/\b(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?\b/i) || kaneObjective.match(/localhost:\d+/i)
      let detectedUrl = 'http://localhost:3001'
      if (urlMatch) {
        let u = urlMatch[0]
        if (!/^https?:\/\//i.test(u)) {
          if (u.startsWith('www.')) u = `https://${u}`
          else if (u.startsWith('localhost')) u = `http://${u}`
          else u = `https://${u}`
        }
        if (u.includes('localhost:3000')) u = u.replace('localhost:3000', 'localhost:3001')
        detectedUrl = u
      }
      setKaneUrlInput(detectedUrl)
      setKanePendingObjective(kaneObjective)
      setShowKaneUrlModal(true)
      return
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: raw,
    }

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: (Date.now() + 1).toString(), role: 'assistant', content: '' },
    ])
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
      agentId: agentId || undefined,
      history,
    }))
  }

  const normalizeKaneObjective = (raw: string, url: string): string => {
    let obj = raw.trim()
    // Extract bare domains like ebay.com or localhost:3000 without protocol and prepend https/http
    if (!obj.match(/https?:\/\//i) && obj.match(/\b(?:www\.)?[a-z0-9-]+\.[a-z]{2,}\b/i)) {
      const domainMatch = obj.match(/\b((?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)\b/i)
      if (domainMatch) {
        const domain = domainMatch[1]
        const withProto = domain.startsWith('www.') ? `https://${domain}` : `https://${domain}`
        obj = obj.replace(domain, withProto)
      }
    }
    if (obj.match(/localhost:3000/i) && !obj.match(/localhost:3001/)) {
      obj = obj.replace(/localhost:3000/gi, 'localhost:3001')
    }
    // Vague "open X on ebay.com" -> "go to https://..."
    if (/^\s*open\s+/i.test(obj) && !/go to/i.test(obj)) {
      obj = obj.replace(/^\s*open\s+/i, 'go to ')
    }
    // Ensure store as exists, otherwise kane returns only "opened" with no final_state
    if (!/store\s+.*as\s+'[^']+'/i.test(obj)) {
      // For chat-related objectives (contains chat, hello, say), use chat store, otherwise page title
      if (/chat|hello|say hello/i.test(obj)) {
        obj = obj.replace(/\s*$/, `, store the assistant message text as 'assistant_reply'`)
      } else {
        obj = obj.replace(/\s*$/, `, store the page title as 'page_title'`)
      }
    }
    return obj
  }

  const handleKaneConfirm = () => {
    if (!kanePendingObjective) return
    const rawObjective = kanePendingObjective
    const url = kaneUrlInput.trim() || 'http://localhost:3001'
    const objective = normalizeKaneObjective(rawObjective, url)
    setShowKaneUrlModal(false)
    setKanePendingObjective(null)
    executeKane(objective, url, `/kane ${rawObjective}`)
  }

  const handleKaneCancel = () => {
    setShowKaneUrlModal(false)
    setKanePendingObjective(null)
  }

  const showKaneHint = input.trim().startsWith('/')

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 0px)' }}>
      <ChatHeader sessionId={sessionId} onSessionChange={onSessionChange} />
      {agent && (
        <div className="px-6 py-2 flex items-center justify-between gap-2 text-xs" style={{ background: 'rgba(0,230,138,0.08)', borderBottom: '1px solid rgba(0,230,138,0.2)', color: 'var(--color-accent-primary)' }}>
          <span className="flex items-center gap-2 min-w-0">
            <Bot size={12} /> Agent: <span className="font-semibold truncate">{agent.name}</span>
          </span>
          <button
            onClick={onAgentClear}
            className="p-1 rounded-md hover:bg-white/10 transition-colors shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
            title="Remove agent"
            aria-label="Remove agent"
          >
            <X size={12} />
          </button>
        </div>
      )}

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
          const showThinking = streaming && streamingThinking && msg.role === 'assistant' && isLast

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
                  {msg.content ? (
                    <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                  ) : msg.role === 'assistant' && streaming && !streamingThinking ? (
                    <span className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-text-muted)' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-text-muted)', animationDelay: '0.15s' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-text-muted)', animationDelay: '0.3s' }} />
                    </span>
                  ) : null}
                  {msg.kaneMeta && (
                    <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: 'rgba(0,230,138,0.08)', border: '1px solid rgba(0,230,138,0.2)', color: 'var(--color-text-secondary)' }}>
                      <div className="font-medium mb-1" style={{ color: 'var(--color-accent-primary)' }}>Kane result — {msg.kaneMeta.status} {msg.kaneMeta.duration ? `(${msg.kaneMeta.duration}s)` : ''}</div>
                      {msg.kaneMeta.summary && <div className="mb-2 whitespace-pre-wrap">{msg.kaneMeta.summary}</div>}
                      {msg.kaneMeta.final_state && Object.keys(msg.kaneMeta.final_state).length > 0 && (
                        <div className="mb-2">
                          <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>What was found</div>
                          {Object.entries(msg.kaneMeta.final_state).map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-2"><span>{k}</span><span style={{ color: 'var(--color-text-primary)' }}>{String(v)}</span></div>
                          ))}
                        </div>
                      )}
                      {msg.kaneMeta.test_url && <a href={msg.kaneMeta.test_url} target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--color-accent-primary)' }}>View details</a>}
                    </div>
                  )}
                </div>
              </motion.div>
            </Fragment>
          )
        })}

        {kaneRunning && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(0,230,138,0.15)' }}>
              <Bot size={16} style={{ color: 'var(--color-accent-primary)' }} />
            </div>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(0,230,138,0.08)', border: '1px solid rgba(0,230,138,0.2)', color: 'var(--color-accent-primary)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Kane is running…</span>
            </div>
          </div>
        )}

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
        {showKaneHint && (
          <div className="mb-2 rounded-xl p-3 text-xs" style={{ background: 'rgba(0,230,138,0.08)', border: '1px solid rgba(0,230,138,0.2)', color: 'var(--color-text-secondary)' }}>
            <div className="font-medium" style={{ color: 'var(--color-accent-primary)' }}>Kane mode — /kane &lt;browser task&gt;</div>
            <div className="mt-1">Example: <code style={{ color: 'var(--color-text-primary)' }}>/kane go to https://ebay.com, search for 'headphones', store the first result price as 'price'</code></div>
            <div className="mt-1 opacity-70">After Send you’ll be asked for the start URL (default http://localhost:3001).</div>
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend() }}
          className="flex items-center overflow-hidden rounded-xl"
          style={{ border: '1px solid var(--color-border-default)' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={wsConnected ? 'Type your message... (/kane <browser task>)' : 'Connecting...'}
            disabled={streaming || kaneRunning || !wsConnected}
            className="flex-1 px-4 py-3 text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--color-text-primary)',
              opacity: streaming || kaneRunning ? 0.5 : 1,
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming || kaneRunning || !wsConnected}
            className="px-4 py-3 transition-all"
            style={{
              background: 'var(--color-accent-primary)',
              color: '#0F1117',
              opacity: !input.trim() || streaming || kaneRunning || !wsConnected ? 0.4 : 1,
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Kane URL modal */}
      {showKaneUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={handleKaneCancel}>
          <div className="glass w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="relative z-10 space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Kane start URL</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Objective: <code style={{ color: 'var(--color-text-primary)' }}>{kanePendingObjective}</code></p>
              <input
                type="text"
                value={kaneUrlInput}
                onChange={(e) => setKaneUrlInput(e.target.value)}
                placeholder="http://localhost:3001"
                className="w-full px-3 py-2 text-sm rounded-xl outline-none font-mono"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={handleKaneCancel} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-default)' }}>Cancel</button>
                <button onClick={handleKaneConfirm} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--color-accent-primary)', color: '#0F1117' }}>Run Kane</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
