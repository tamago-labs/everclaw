import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Cpu, ScrollText, Info, Trash2 } from 'lucide-react'
import { fetchAiStatus, setAiConfig, fetchLogs, clearLogs, fetchModels, type AiStatus, type ModelEntry } from '../api'

const CTX_SIZES = [2048, 4096, 8192, 16384]

export default function SettingsPage() {
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [models, setModels] = useState<ModelEntry[]>([])
  const [ctxSize, setCtxSize] = useState<number>(8192)
  const [logs, setLogs] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const refreshStatus = async () => {
    const s = await fetchAiStatus()
    setStatus(s)
    setCtxSize(s.config.ctx_size)
  }

  const refreshLogs = async () => {
    const r = await fetchLogs()
    setLogs(r.logs)
  }

  useEffect(() => {
    refreshStatus()
    fetchModels().then((r) => setModels(r.models)).catch(() => {})
    refreshLogs()
    const t = setInterval(refreshLogs, 3000)
    return () => clearInterval(t)
  }, [])

  const handleCtxChange = async (size: number) => {
    setCtxSize(size)
    await setAiConfig(size)
    refreshStatus()
  }

  const handleClearLogs = async () => {
    setBusy(true)
    try {
      await clearLogs()
      await refreshLogs()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.h1
          className="text-2xl font-bold text-gradient-white mb-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Settings
        </motion.h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Manage the AI runtime, view logs, and app info.</p>

        {/* AI Configuration */}
        <Section icon={<Cpu size={18} />} title="AI Configuration">
          <div className="space-y-4">
            <Row label="Loaded model">
              <span className="text-sm font-medium" style={{ color: status?.loaded ? 'var(--color-accent-primary)' : 'var(--color-text-muted)' }}>
                {status?.loaded ? status.modelName : 'No model loaded'}
              </span>
            </Row>
            <Row label="Context size (ctx_size)">
              <div className="flex gap-2">
                {CTX_SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleCtxChange(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      color: ctxSize === s ? '#0F1117' : 'var(--color-text-secondary)',
                      background: ctxSize === s ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    {s >= 1024 ? `${s / 1024}k` : s}
                  </button>
                ))}
              </div>
            </Row>
            {status?.loaded && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Context size applies on next model load.
              </p>
            )}
          </div>
        </Section>

        {/* Logs */}
        <Section icon={<ScrollText size={18} />} title="Logs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{logs.length} entries (auto-refresh 3s)</span>
            <button
              onClick={handleClearLogs}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ color: '#F87171', background: 'rgba(239,68,68,0.12)' }}
            >
              <Trash2 size={13} />
              Clear
            </button>
          </div>
          <div
            className="rounded-xl p-4 h-72 overflow-y-auto font-mono text-xs leading-relaxed"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
          >
            {logs.length === 0 ? (
              <span style={{ color: 'var(--color-text-muted)' }}>No logs yet.</span>
            ) : (
              logs.slice().reverse().map((l, i) => (
                <div key={i} className="whitespace-pre-wrap break-words">{l}</div>
              ))
            )}
          </div>
        </Section>

        {/* About */}
        <Section icon={<Info size={18} />} title="About">
          <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <Row label="App"><span style={{ color: 'var(--color-text-primary)' }}>Everclaw</span></Row>
            <Row label="Version"><span style={{ color: 'var(--color-text-primary)' }}>0.1.0</span></Row>
            <Row label="Engine"><span style={{ color: 'var(--color-text-primary)' }}>QVAC SDK (@qvac/sdk)</span></Row>
            <Row label="Built-in models">
              <span style={{ color: 'var(--color-text-primary)' }}>
                {models.filter((m) => m.builtin).map((m) => m.name).join(', ') || '—'}
              </span>
            </Row>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      className="rounded-2xl p-6"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--color-accent-primary)' }}>{icon}</span>
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      </div>
      {children}
    </motion.div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      {children}
    </div>
  )
}
