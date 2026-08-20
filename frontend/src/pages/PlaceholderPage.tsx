import { useAI } from '../context/AIContext'
import { unloadModel } from '../api'

function formatUptime(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ${sec % 60}s`
  const hr = Math.floor(min / 60)
  return `${hr}h ${min % 60}m`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

export default function PlaceholderPage() {
  const { status, refresh } = useAI()

  const handleUnload = async () => {
    await unloadModel()
    await refresh()
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Page title */}
        <h1 className="text-2xl font-bold text-gradient-white mb-6">Overview</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Welcome card */}
          <div className="glass-glow md:col-span-2 p-6">
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Welcome to Everclaw
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Your local AI assistant with browser automation capabilities.
                    Powered by QVAC for on-device inference.
                  </p>
                </div>
                <div className="icon-glow w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ml-4" style={{ background: 'var(--color-bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-accent-primary)' }}>
                <span>Get started with a chat</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* AI Status card */}
          <div className="glass p-6">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="icon-glow w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M9 9h6v6H9z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Model</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{status?.modelName}</span>
                </div>
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Status</span>
                  <span className="text-sm font-medium" style={{ color: '#00E68A' }}>Ready</span>
                </div>
                <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Context</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{status?.config.ctx_size}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Uptime</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {status?.loadedAt ? formatUptime(Date.now() - status.loadedAt) : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder message */}
        <div className="glass p-6">
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-accent-primary-dim)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Phase 1 Complete</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Model loaded successfully. Phase 2 will add chat, agents, and browser tools.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleUnload} className="btn-ghost text-sm">
                Unload Model
              </button>
              <button onClick={() => window.location.reload()} className="btn-ghost text-sm">
                Change Model
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
