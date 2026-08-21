import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Cpu, ScrollText, Trash2, Boxes, Copy, Check, RefreshCw } from 'lucide-react'
import { fetchAiStatus, setAiConfig, fetchLogs, clearLogs, fetchKaneStatus, type AiStatus } from '../api'
import SettingsTabs from '../components/settings/SettingsTabs'
import SettingsContent from '../components/settings/SettingsContent'

const CTX_SIZES = [2048, 4096, 8192, 16384]
type Tab = 'ai' | 'kane' | 'logs'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ai')
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [ctxSize, setCtxSize] = useState<number>(8192)
  const [logs, setLogs] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [kane, setKane] = useState<{ available: boolean; version: string | null; authenticated: boolean } | null>(null)
  const [kaneLoading, setKaneLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const refreshStatus = async () => {
    const s = await fetchAiStatus()
    setStatus(s)
    setCtxSize(s.config.ctx_size)
  }

  const refreshLogs = async () => {
    const r = await fetchLogs()
    setLogs(r.logs)
  }

  const refreshKane = async () => {
    setKaneLoading(true)
    try {
      const r = await fetchKaneStatus()
      setKane(r)
    } catch {
      setKane(null)
    } finally {
      setKaneLoading(false)
    }
  }

  useEffect(() => {
    refreshStatus()
    refreshLogs()
    refreshKane()
    const t = setInterval(refreshLogs, 3000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (activeTab === 'kane') refreshKane()
  }, [activeTab])

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1800)
  }

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
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Manage the AI runtime and view logs.</p>

        <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <SettingsContent>
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: 'var(--color-accent-primary)' }}><Cpu size={18} /></span>
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>AI Configuration</h2>
              </div>
              <Row label="App version">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>v0.5.5</span>
              </Row>
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
          )}
          {activeTab === 'kane' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--color-accent-primary)' }}><Boxes size={18} /></span>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Kane CLI</h2>
                </div>
                <button onClick={refreshKane} disabled={kaneLoading} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                  <RefreshCw size={14} className={kaneLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {!kane ? (
                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{kaneLoading ? 'Checking...' : 'Unable to reach /api/kane/status'}</div>
              ) : (
                <>
                  <Row label="Installed">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="w-2 h-2 rounded-full" style={{ background: kane.available ? '#00E68A' : '#F87171' }} />
                      <span style={{ color: kane.available ? 'var(--color-accent-primary)' : '#F87171' }}>{kane.available ? (kane.version || 'yes') : 'not found'}</span>
                    </span>
                  </Row>
                  <Row label="Authenticated">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="w-2 h-2 rounded-full" style={{ background: kane.authenticated ? '#00E68A' : '#F87171' }} />
                      <span style={{ color: kane.authenticated ? 'var(--color-accent-primary)' : '#F87171' }}>{kane.authenticated ? 'yes' : 'no'}</span>
                    </span>
                  </Row>

                  <div className="pt-2 space-y-3">
                    <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>CLI hints — click to copy</div>
                    {[
                      { cmd: 'kane-cli --version', key: 'v' },
                      { cmd: 'kane-cli whoami', key: 'who' },
                    ].map((c) => (
                      <button
                        key={c.key}
                        onClick={() => handleCopy(c.cmd, c.key)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all hover:bg-white/5"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border-default)' }}
                      >
                        <code className="text-xs font-mono" style={{ color: 'var(--color-text-primary)' }}>{c.cmd}</code>
                        {copied === c.key ? <Check size={12} style={{ color: 'var(--color-accent-primary)' }} /> : <Copy size={12} style={{ color: 'var(--color-text-muted)' }} />}
                      </button>
                    ))}
                    {!kane.authenticated && (
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                        Not authenticated — run <code className="font-mono" style={{ color: 'var(--color-text-primary)' }}>kane-cli login</code> or set up Kane CLI, then refresh.
                      </p>
                    )}
                    {!kane.available && (
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                        Kane CLI not found in PATH. Install it and restart the CLI so `kane-cli --version` works.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: 'var(--color-accent-primary)' }}><ScrollText size={18} /></span>
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Logs</h2>
              </div>
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
            </div>
          )}
        </SettingsContent>
      </div>
    </div>
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
