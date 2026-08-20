import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, Check, Eraser } from 'lucide-react'
import { fetchSessions, createSession, type Session } from '../../api'
import CreateSessionModal from '../sessions/CreateSessionModal'

interface Props {
  sessionId: string | null
  onSessionChange: (id: string) => void
  onClear?: () => void
}

export default function ChatHeader({ sessionId, onSessionChange, onClear }: Props) {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadSessions = () => fetchSessions().then((r) => setSessions(r.sessions))
  useEffect(() => { loadSessions() }, [])

  // Auto-select first session if none selected
  useEffect(() => {
    if (!sessionId && sessions.length > 0) {
      onSessionChange(sessions[0].id)
    }
  }, [sessionId, sessions])

  const currentSession = sessions.find((s) => s.id === sessionId)

  const handleCreate = async (name: string) => {
    const session = await createSession(name)
    setShowCreate(false)
    await loadSessions()
    onSessionChange(session.id)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      <div
        className="flex items-center justify-between px-5 h-12 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        {/* Session dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: dropdownOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: 'var(--color-text-primary)',
            }}
          >
            <span>{currentSession?.name || 'Select session'}</span>
            <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute top-full left-0 mt-1 w-64 rounded-xl overflow-hidden z-50"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-default)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div className="p-1 max-h-64 overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    No sessions yet
                  </div>
                ) : (
                  sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { onSessionChange(s.id); setDropdownOpen(false) }}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-left text-sm transition-all"
                      style={{
                        background: s.id === sessionId ? 'var(--color-accent-primary-dim)' : 'transparent',
                        color: s.id === sessionId ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                      }}
                      onMouseEnter={(e) => { if (s.id !== sessionId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={(e) => { if (s.id !== sessionId) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span className="truncate">{s.name}</span>
                      {s.id === sessionId && <Check size={14} />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* New session button */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ color: 'var(--color-accent-primary)', background: 'var(--color-accent-primary-dim)' }}
        >
          <Plus size={14} />
          New Session
        </button>

        {/* Clear conversation (default session only) */}
        {currentSession?.default && (
          <button
            onClick={() => {
              if (window.confirm('Clear all messages in this conversation?')) onClear?.()
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ color: 'rgba(251,191,36,0.9)', background: 'rgba(245,158,11,0.12)' }}
            title="Clear messages"
          >
            <Eraser size={14} />
            Clear
          </button>
        )}
      </div>

      {showCreate && (
        <CreateSessionModal
          onCreated={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  )
}
