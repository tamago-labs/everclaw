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

export default function PlaceholderPage() {
  const { status, refresh } = useAI()

  const handleUnload = async () => {
    await unloadModel()
    await refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-lg glass p-8 text-center space-y-6 glow-green">
        {/* Success icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-accent-glow flex items-center justify-center">
          <svg className="w-8 h-8 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Model info */}
        <div>
          <h1 className="text-xl font-bold text-white mb-1">{status?.modelName}</h1>
          <p className="text-sm text-white/40">Model loaded successfully</p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 text-sm">
          <div>
            <div className="text-white/30 text-xs mb-0.5">Context</div>
            <div className="text-white font-medium">{status?.config.ctx_size}</div>
          </div>
          <div>
            <div className="text-white/30 text-xs mb-0.5">Tools</div>
            <div className="text-white font-medium">{status?.config.tools ? 'On' : 'Off'}</div>
          </div>
          <div>
            <div className="text-white/30 text-xs mb-0.5">Uptime</div>
            <div className="text-white font-medium">
              {status?.loadedAt ? formatUptime(Date.now() - status.loadedAt) : '-'}
            </div>
          </div>
        </div>

        {/* Placeholder message */}
        <div className="glass p-4">
          <p className="text-sm text-white/50">
            Phase 1 complete. Phase 2 will add chat, agents, and browser tools.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button onClick={handleUnload} className="btn-ghost text-sm">
            Unload Model
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-ghost text-sm"
          >
            Change Model
          </button>
        </div>
      </div>
    </div>
  )
}
