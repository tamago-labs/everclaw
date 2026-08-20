import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

interface Props {
  onCreated: (name: string) => void
  onClose: () => void
}

export default function CreateSessionModal({ onCreated, onClose }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    onCreated(name.trim())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <motion.div
        className="glass p-6 w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Create New Session</h3>
            <button onClick={onClose} style={{ color: 'var(--color-text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null) }}
            placeholder="e.g., research, brainstorm, coding"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />

          {error && (
            <p className="text-xs mb-4" style={{ color: '#F87171' }}>{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ border: '1px solid var(--color-border-default)', color: 'var(--color-text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="btn-primary flex-1"
            >
              Create Session
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
