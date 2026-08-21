import { useState } from 'react'
import { X } from 'lucide-react'
import { createAgent } from '../../api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CreateAgentModal({ isOpen, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('Your name is Sally. You are a capable, direct, and efficient assistant. Be accurate and helpful. Keep replies concise unless more detail is needed. End sentences casually with \'lah\' when it feels natural.')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canSubmit = name.trim().length > 0 && systemPrompt.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || busy) return
    setError(null)
    setBusy(true)
    try {
      await createAgent({ name: name.trim(), description: description.trim() || undefined, systemPrompt: systemPrompt.trim() })
      setName('')
      setDescription('')
      setSystemPrompt('Your name is Sally. You are a capable, direct, and efficient assistant. Be accurate and helpful. Keep replies concise unless more detail is needed. End sentences casually with \'lah\' when it feels natural.')
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create agent')
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div
        className="glass w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between p-5 pb-4 border-b shrink-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Create Agent</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--color-text-muted)' }}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>{error}</div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Research Helper"
                className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this agent does"
                className="w-full px-3 py-2 text-sm rounded-xl outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>System prompt</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                placeholder="You are..."
                className="w-full px-3 py-2 text-sm rounded-xl outline-none resize-none font-mono"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>Injected as system role for chats with this agent. Local only.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-default)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit || busy}
                className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-40"
              >
                {busy ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
