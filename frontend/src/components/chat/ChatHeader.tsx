import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { fetchSessions, createSession, type Session } from '../../api'
import CreateSessionModal from '../sessions/CreateSessionModal'

interface Props {
  sessionId: string | null
  onNewSession: () => void
}

export default function ChatHeader({ sessionId, onNewSession }: Props) {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [showCreate, setShowCreate] = useState(false)

  const loadSessions = () => fetchSessions().then((r) => setSessions(r.sessions))
  useEffect(() => { loadSessions() }, [])

  const currentSession = sessions.find((s) => s.id === sessionId)

  const handleCreate = async (name: string) => {
    const session = await createSession(name)
    setShowCreate(false)
    await loadSessions()
    navigate(`/chat?session=${session.id}`)
  }

  return (
    <>
      <div
        className="flex items-center justify-between px-5 h-12 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {currentSession?.name || 'Chat'}
          </span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ color: 'var(--color-accent-primary)', background: 'var(--color-accent-primary-dim)' }}
        >
          <Plus size={14} />
          New Session
        </button>
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
