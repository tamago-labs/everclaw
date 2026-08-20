import { useState, useEffect } from 'react'
import { useAI } from '../context/AIContext'
import { fetchModels, loadModelSSE, type ModelEntry } from '../api'

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

export default function ModelSelectPage() {
  const { refresh } = useAI()
  const [models, setModels] = useState<ModelEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [ctxSize, setCtxSize] = useState(8192)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchModels().then((r) => setModels(r.models))
  }, [])

  const selected = models.find((m) => m.id === selectedId)

  const handleLoad = () => {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    setProgress({ phase: 'starting', percent: 0 })

    loadModelSSE(
      selectedId,
      ctxSize,
      (data) => setProgress(data),
      async () => {
        setLoading(false)
        setProgress(null)
        await refresh()
      },
      (msg) => {
        setLoading(false)
        setProgress(null)
        setError(msg)
      },
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-[520px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-ev-accent flex items-center justify-center mx-auto mb-4" style={{ boxShadow: '0 0 20px rgba(0, 230, 138, 0.4)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F1117" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gradient-white mb-2">Welcome</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Choose a model to get started</p>
        </div>

        {/* Model cards */}
        <div className="space-y-3 mb-6">
          {models.map((model, i) => (
            <button
              key={model.id}
              disabled={loading}
              onClick={() => setSelectedId(model.id)}
              className="glass w-full text-left p-5 transition-all duration-200 cursor-pointer"
              style={{
                borderColor: selectedId === model.id ? 'rgba(0, 230, 138, 0.5)' : undefined,
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                    {model.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {model.description}
                  </div>
                </div>
                <div className="text-xs px-2.5 py-1 rounded-full ml-3 shrink-0" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)' }}>
                  {model.params}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Config panel */}
        <div className="glass p-5 mb-6">
          <div className="relative z-10">
            <label className="text-xs font-medium block mb-2" style={{ color: 'var(--color-text-muted)' }}>Context Size</label>
            <div className="flex gap-2">
              {[2048, 4096, 8192, 16384].map((size) => (
                <button
                  key={size}
                  disabled={loading}
                  onClick={() => setCtxSize(size)}
                  className="flex-1 py-2 text-xs rounded-xl border transition-all font-medium"
                  style={{
                    borderColor: ctxSize === size ? 'rgba(0, 230, 138, 0.5)' : 'var(--color-border-default)',
                    background: ctxSize === size ? 'var(--color-accent-primary-dim)' : 'transparent',
                    color: ctxSize === size ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  {size >= 1024 ? `${size / 1024}K` : size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress */}
        {progress && progress.phase !== 'done' && (
          <div className="glass p-5 mb-6">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {selected?.name || 'Loading...'}
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {progress.phase === 'downloading' ? 'Downloading...' : 'Loading into memory...'}
                </span>
              </div>
              <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent || 0}%`, background: 'var(--color-accent-primary)' }}
                />
              </div>
              {progress.message && (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{progress.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl text-sm mb-6" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171' }}>
            {error}
          </div>
        )}

        {/* Load button */}
        <button
          onClick={handleLoad}
          disabled={!selectedId || loading}
          className="btn-primary w-full"
        >
          {loading ? 'Loading...' : selected ? `Load ${selected.name}` : 'Select a model'}
        </button>

        {/* Download info */}
        <p className="text-center text-xs mt-4" style={{ color: 'var(--color-accent-primary)', opacity: 0.7 }}>
          Initial download required. Subsequent uses will load from local cache.
        </p>
      </div>
    </div>
  )
}
