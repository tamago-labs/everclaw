import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SessionsTable from '../components/sessions/SessionsTable'
import { fetchSessions, deleteSession, clearSessionMessages, type Session } from '../api'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingRemove, setPendingRemove] = useState<Session | null>(null)
  const [pendingClear, setPendingClear] = useState<Session | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const loadSessions = async () => {
    setLoading(true)
    const r = await fetchSessions()
    setSessions(r.sessions)
    setLoading(false)
  }

  useEffect(() => { loadSessions() }, [])

  const handleOpen = (id: string) => {
    navigate(`/?session=${encodeURIComponent(id)}`)
  }

  const confirmRemove = async () => {
    if (!pendingRemove) return
    setBusy(true)
    try {
      await deleteSession(pendingRemove.id)
      setPendingRemove(null)
      await loadSessions()
    } finally {
      setBusy(false)
    }
  }

  const confirmClear = async () => {
    if (!pendingClear) return
    setBusy(true)
    try {
      await clearSessionMessages(pendingClear.id)
      setPendingClear(null)
      await loadSessions()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <motion.h1
          className="text-2xl font-bold text-gradient-white mb-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Sessions
        </motion.h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          All conversations. The default session can be cleared but not removed.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SessionsTable
            sessions={sessions}
            loading={loading}
            onOpen={handleOpen}
            onRemove={setPendingRemove}
            onClear={setPendingClear}
          />
        </motion.div>
      </div>

      {/* Remove confirm */}
      {pendingRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-[360px]" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Remove session?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
              "<strong>{pendingRemove.name}</strong>" and its {pendingRemove.messageCount ?? 0} messages will be permanently deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingRemove(null)}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.06)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ color: '#fff', background: '#EF4444' }}
              >
                {busy ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirm */}
      {pendingClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-[360px]" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Clear messages?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
              All {pendingClear.messageCount ?? 0} messages in "<strong>{pendingClear.name}</strong>" will be erased. The session is kept.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingClear(null)}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.06)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ color: '#0F1117', background: 'var(--color-accent-primary)' }}
              >
                {busy ? 'Clearing...' : 'Clear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
