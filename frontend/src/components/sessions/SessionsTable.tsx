import { motion } from 'framer-motion'
import { MessageSquare, Trash2, ExternalLink } from 'lucide-react'
import type { Session } from '../../api'
import GlassButton from '../common/GlassButton'

interface Props {
  sessions: Session[]
  loading: boolean
  onOpen: (id: string) => void
  onRemove: (session: Session) => void
  onClear: (session: Session) => void
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function SessionsTable({ sessions, loading, onOpen, onRemove, onClear }: Props) {
  if (loading) {
    return (
      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading sessions...</div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}
      >
        <MessageSquare size={32} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No sessions yet. Start a chat to create one.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)' }}>
      <div
        className="grid grid-cols-[1fr_120px_140px_180px] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.15em] font-brand"
        style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-muted)' }}
      >
        <div>Session</div>
        <div className="text-center">Messages</div>
        <div className="text-center">Last Active</div>
        <div className="text-right">Actions</div>
      </div>

      {sessions.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="grid grid-cols-[1fr_120px_140px_180px] px-5 py-4 items-center"
          style={{ borderTop: '1px solid var(--color-border-subtle)', background: 'transparent' }}
        >
          <button
            onClick={() => onOpen(s.id)}
            className="flex items-center gap-3 text-left group"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: s.default ? 'var(--color-accent-primary-dim)' : 'rgba(255,255,255,0.06)' }}
            >
              <MessageSquare size={16} style={{ color: s.default ? 'var(--color-accent-primary)' : 'var(--color-text-muted)' }} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {s.name}
                {s.default && (
                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-accent-primary-dim)', color: 'var(--color-accent-primary)' }}>
                    DEFAULT
                  </span>
                )}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{s.id}</div>
            </div>
          </button>

          <div className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>{s.messageCount ?? 0}</div>
          <div className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>{relativeTime(s.updatedAt)}</div>

          <div className="flex items-center justify-end gap-2">
            <GlassButton icon={<ExternalLink size={14} />} label="Open" title="Open chat" variant="success" onClick={() => onOpen(s.id)} />
            {s.default ? (
              <GlassButton icon={<Trash2 size={14} />} variant="danger" title="Clear messages" iconOnly onClick={() => onClear(s)} />
            ) : (
              <GlassButton icon={<Trash2 size={14} />} variant="danger" title="Remove session" iconOnly onClick={() => onRemove(s)} />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
