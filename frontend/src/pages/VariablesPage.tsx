import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, Plus, Trash2, Eye, EyeOff, Pencil } from 'lucide-react'
import { fetchVariables, createVariable, updateVariable, deleteVariable, type Variable } from '../api'
import GlassButton from '../components/common/GlassButton'

export default function VariablesPage() {
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Variable | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Variable | null>(null)
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState<Record<string, boolean>>({})

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetchVariables()
      setVariables(r.variables)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await deleteVariable(pendingDelete.id)
      setPendingDelete(null)
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <motion.h1 className="text-2xl font-bold text-gradient-white mb-1 flex items-center gap-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <KeyRound size={22} style={{ color: 'var(--color-accent-primary)' }} />
              Variables
              {variables.length > 0 && <span className="text-sm font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--color-accent-primary-dim)', color: 'var(--color-accent-primary)' }}>{variables.length}</span>}
            </motion.h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Local secrets for Kane — use <code style={{ color: 'var(--color-text-primary)' }}>{'{{username}}'}</code> in objectives, value stays local.
            </p>
          </div>
          <GlassButton icon={<Plus size={16} />} label="New Variable" onClick={() => { setEditing(null); setShowCreate(true) }} />
        </div>

        {loading ? (
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : variables.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 text-center">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border-default)' }}>
                <KeyRound size={20} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>No variables yet</div>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Create <code>{'{{username}}'}</code> with value <code>pisuthd</code> to use in Kane objectives. On the Kane modal it shows as <code>****</code> if secret.</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">Create Variable</button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {variables.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  layout
                  className="glass p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-accent-primary)' }}>{`{{${v.name}}}`}</span>
                      {v.secret && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>secret</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-mono truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {v.secret && !reveal[v.id] ? '****' : v.value}
                      </span>
                      <button onClick={() => setReveal((r) => ({ ...r, [v.id]: !r[v.id] }))} className="p-1 rounded hover:bg-white/10" style={{ color: 'var(--color-text-muted)' }}>
                        {reveal[v.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{new Date(v.updatedAt).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <GlassButton icon={<Pencil size={14} />} label="Edit" onClick={() => { setEditing(v); setShowCreate(true) }} />
                    <GlassButton icon={<Trash2 size={14} />} variant="danger" iconOnly title="Delete" onClick={() => setPendingDelete(v)} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <VariableModal isOpen={showCreate} onClose={() => { setShowCreate(false); setEditing(null) }} onSaved={load} editing={editing} />

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-[360px]" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Delete variable?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>{`{{${pendingDelete.name}}}`} will be permanently deleted.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingDelete(null)} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
              <button onClick={handleDelete} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#fff', background: '#EF4444' }}>{busy ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function VariableModal({ isOpen, onClose, onSaved, editing }: { isOpen: boolean; onClose: () => void; onSaved: () => void; editing: Variable | null }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [secret, setSecret] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setValue(editing.value)
      setSecret(editing.secret)
    } else {
      setName('')
      setValue('')
      setSecret(false)
    }
    setError(null)
  }, [editing, isOpen])

  if (!isOpen) return null

  const canSubmit = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name.trim()) && value.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || busy) return
    setError(null)
    setBusy(true)
    try {
      if (editing) await updateVariable(editing.id, { name: name.trim(), value, secret })
      else await createVariable({ name: name.trim(), value, secret })
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="glass w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="relative z-10 space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{editing ? 'Edit Variable' : 'New Variable'}</h3>
          {error && <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Name (for {'{{name}}'})</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="username" className="w-full px-3 py-2 text-sm rounded-xl outline-none font-mono" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Value</label>
              <input type={secret ? 'password' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} placeholder="pisuthd" className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }} />
            </div>
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
              Secret (show as **** in Kane modal)
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-default)' }}>Cancel</button>
              <button type="submit" disabled={!canSubmit || busy} className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40" style={{ background: 'var(--color-accent-primary)', color: '#0F1117' }}>{busy ? 'Saving…' : editing ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
