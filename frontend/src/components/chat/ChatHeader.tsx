import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { fetchSessions, createSession, type Session } from '../../api'
import CreateSessionModal from '../sessions/CreateSessionModal'
import GlassDropdown from '../common/GlassDropdown'
import GlassButton from '../common/GlassButton'

interface Props {
  sessionId: string | null
  onSessionChange: (id: string) => void
}

export default function ChatHeader({ sessionId, onSessionChange }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [showCreate, setShowCreate] = useState(false)

  const loadSessions = () => fetchSessions().then((r) => setSessions(r.sessions))
  useEffect(() => { loadSessions() }, [])

  // Auto-select first session if none selected
  useEffect(() => {
    if (!sessionId && sessions.length > 0) {
      onSessionChange(sessions[0].id)
    }
  }, [sessionId, sessions])

  const handleCreate = async (name: string) => {
    const session = await createSession(name)
    setShowCreate(false)
    await loadSessions()
    onSessionChange(session.id)
  }

  const sessionOptions = sessions.map((s) => ({
    value: s.id,
    label: s.name,
  }))

  return (
    <>
      <div
        className="flex items-center justify-between px-5 h-12 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
      >
        <GlassDropdown
          label="Session"
          value={sessionId || ''}
          options={sessionOptions}
          onChange={onSessionChange}
        />

        <GlassButton icon={<Plus size={16} />} title="New session" onClick={() => setShowCreate(true)} />
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
