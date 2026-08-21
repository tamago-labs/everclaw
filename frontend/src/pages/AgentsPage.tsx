import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Plus, Trash2, MessageSquare, Save, Pencil } from 'lucide-react'
import { fetchAgents, deleteAgent, updateAgent, type Agent } from '../api'
import GlassButton from '../components/common/GlassButton'
import CreateAgentModal from '../components/agents/CreateAgentModal'

type Tab = 'overview' | 'instructions'

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Agent | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetchAgents()
      setAgents(r.agents)
      if (r.agents.length && !selectedId) setSelectedId(r.agents[0].id)
      if (r.agents.length === 0) setSelectedId(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const selected = agents.find((a) => a.id === selectedId) || null

  useEffect(() => {
    if (selected) setDraft(selected.systemPrompt)
  }, [selected?.id])

  const handleChat = (id: string) => {
    navigate(`/?agent=${encodeURIComponent(id)}`)
  }

  const handleSave = async () => {
    if (!selected) return
    if (draft.trim() === selected.systemPrompt) return
    setSaving(true)
    try {
      const updated = await updateAgent(selected.id, { systemPrompt: draft.trim() })
      setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await deleteAgent(pendingDelete.id)
      setPendingDelete(null)
      if (selectedId === pendingDelete.id) setSelectedId(null)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const dirty = selected ? draft.trim() !== selected.systemPrompt : false

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <motion.h1 className="text-2xl font-bold text-gradient-white mb-1 flex items-center gap-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <Bot size={22} style={{ color: 'var(--color-accent-primary)' }} />
              Agents
              {agents.length > 0 && <span className="text-sm font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--color-accent-primary-dim)', color: 'var(--color-accent-primary)' }}>{agents.length}</span>}
            </motion.h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Local personas. Each agent injects its own system prompt — shared model, no cloud.
            </p>
          </div>
          <GlassButton icon={<Plus size={16} />} label="New Agent" onClick={() => setShowCreate(true)} />
        </div>

        {/* List */}
        {loading ? (
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : agents.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 text-center">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border-default)' }}>
                <Bot size={20} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>No agents yet</div>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Create your first local persona — it will override the default system prompt in chat.</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">Create Agent</button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left list */}
            <div className="lg:col-span-1 space-y-3">
              <AnimatePresence mode="popLayout">
                {agents.map((a, i) => (
                  <motion.button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className="glass w-full text-left px-4 py-3 transition-all relative"
                    style={{ borderColor: selectedId === a.id ? 'rgba(0,230,138,0.5)' : undefined, background: selectedId === a.id ? 'rgba(0,230,138,0.08)' : undefined }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    layout
                  >
                    <div className="relative z-10">
                      <div className="font-medium text-sm truncate" style={{ color: selectedId === a.id ? 'var(--color-accent-primary)' : 'var(--color-text-primary)' }}>{a.name}</div>
                      <div className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{a.description || '—'}</div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {/* Right detail */}
            <div className="lg:col-span-2">
              {selected ? (
                <div className="glass overflow-hidden">
                  <div className="relative z-10">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1.5 border-b" style={{ borderColor: 'var(--color-border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                      {(['overview', 'instructions'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTab(t)}
                          className="relative px-4 py-2 text-sm font-medium capitalize transition-colors"
                          style={{ color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                        >
                          {t}
                          {tab === t && <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'var(--color-accent-primary)' }} />}
                        </button>
                      ))}
                    </div>

                    <div className="p-5">
                      {tab === 'overview' && (
                        <div className="space-y-4">
                          <div>
                            <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{selected.name}</div>
                            <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{selected.description || 'No description'}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border-default)' }}>
                              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Created</div>
                              <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{new Date(selected.createdAt).toLocaleString()}</div>
                            </div>
                            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border-default)' }}>
                              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Updated</div>
                              <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{new Date(selected.updatedAt).toLocaleString()}</div>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                              <Pencil size={12} /> System prompt (preview)
                            </div>
                            <div className="rounded-xl p-3 text-sm font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-secondary)' }}>
                              {selected.systemPrompt.slice(0, 600)}{selected.systemPrompt.length > 600 ? '\n… truncated — see Instructions' : ''}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <GlassButton icon={<MessageSquare size={14} />} label="Open in Chat" onClick={() => handleChat(selected.id)} />
                            <GlassButton icon={<Trash2 size={14} />} label="Delete" variant="danger" onClick={() => setPendingDelete(selected)} />
                          </div>
                        </div>
                      )}

                      {tab === 'instructions' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>System prompt</div>
                            {dirty && <span className="text-xs" style={{ color: '#F59E0B' }}>Unsaved changes</span>}
                          </div>
                          <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            rows={12}
                            className="w-full px-3 py-3 text-sm rounded-xl outline-none resize-none font-mono"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
                            placeholder="You are..."
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setDraft(selected.systemPrompt)}
                              disabled={!dirty || saving}
                              className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-default)' }}
                            >
                              Reset
                            </button>
                            <button
                              onClick={handleSave}
                              disabled={!dirty || saving}
                              className="px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-40"
                              style={{ background: 'var(--color-accent-primary)', color: '#0F1117' }}
                            >
                              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                            Used as the `system` message for this agent’s chats. Local only — the global model is shared.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>Select an agent</div>
              )}
            </div>
          </div>
        )}
      </div>

      <CreateAgentModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />

      {/* Delete confirm */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-[360px]" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Delete agent?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
              "{pendingDelete.name}" will be permanently deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingDelete(null)} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.06)' }}>
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#fff', background: '#EF4444' }}>
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
