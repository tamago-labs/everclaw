import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { deleteSession, createSession, type Session } from '../../api'
import CreateSessionModal from './CreateSessionModal'

interface Props {
  sessions: Session[]
  loading: boolean
  onRefresh: () => void
}

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SessionsTable({ sessions, loading, onRefresh }: Props) {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteSession(deleteId)
    setDeleteId(null)
    onRefresh()
  }

  const handleCreate = async (name: string) => {
    const session = await createSession(name)
    setShowCreate(false)
    onRefresh()
    navigate(`/chat?session=${session.id}`)
  }

  return (
    <>
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Sessions ({sessions.length})
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ color: 'var(--color-accent-primary)', background: 'var(--color-accent-primary-dim)' }}
          >
            New Session
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--color-accent-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No sessions found. Create one to start chatting.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {['Name', 'Messages', 'Last Active', 'Created', ''].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => navigate(`/chat?session=${s.id}`)}
                  >
                    <td className="px-5 py-4 text-sm font-medium" style={{ color: 'var(--color-accent-primary)' }}>
                      {s.name}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      —
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {timeAgo(s.updatedAt)}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(s.id) }}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--color-text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setDeleteId(null)}
        >
          <motion.div
            className="glass p-6 w-full max-w-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative z-10">
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Delete Session</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                Are you sure you want to delete this session? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ border: '1px solid var(--color-border-default)', color: 'var(--color-text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: '#EF4444', color: 'white' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showCreate && (
        <CreateSessionModal
          onCreated={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  )
}
