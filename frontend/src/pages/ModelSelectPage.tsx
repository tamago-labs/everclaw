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
  const [tools, setTools] = useState(false)
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
      tools,
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
      <div className="w-full max-w-5xl glass p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">🦞 Everclaw-New</h1>
          <p className="text-white/40 text-sm">Select an AI model to get started</p>
        </div>

        <div className="flex gap-6">
          {/* Left: Model grid */}
          <div className="flex-[3]">
            <div className="grid grid-cols-2 gap-3">
              {models.map((model) => (
                <button
                  key={model.id}
                  disabled={loading}
                  onClick={() => setSelectedId(model.id)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedId === model.id
                      ? 'border-accent-primary bg-accent-glow'
                      : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{model.name}</span>
                    <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                      {model.params}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mb-2">{model.description}</p>
                  <div className="flex items-center gap-2 text-xs text-white/30">
                    <span>{model.quantization}</span>
                    <span>·</span>
                    <span>{formatBytes(model.sizeBytes)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Config + Load */}
          <div className="flex-[2] space-y-4">
            {/* Config */}
            <div className="glass p-4 space-y-4">
              <h3 className="text-sm font-medium text-white/60">Configuration</h3>

              {/* Context size */}
              <div>
                <label className="text-xs text-white/40 block mb-1.5">Context Size</label>
                <div className="flex gap-1.5">
                  {[2048, 4096, 8192, 16384].map((size) => (
                    <button
                      key={size}
                      disabled={loading}
                      onClick={() => setCtxSize(size)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                        ctxSize === size
                          ? 'border-accent-primary bg-accent-glow text-white'
                          : 'border-white/8 text-white/40 hover:border-white/15'
                      }`}
                    >
                      {size >= 1024 ? `${size / 1024}K` : size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tools toggle */}
              <div>
                <label className="text-xs text-white/40 block mb-1.5">Tool Calling</label>
                <div className="flex gap-1.5">
                  {[
                    { label: 'Off', value: false },
                    { label: 'On', value: true },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      disabled={loading}
                      onClick={() => setTools(opt.value)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                        tools === opt.value
                          ? 'border-accent-primary bg-accent-glow text-white'
                          : 'border-white/8 text-white/40 hover:border-white/15'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Load status */}
            {progress && progress.phase !== 'done' && (
              <div className="glass p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">
                    {selected?.name || 'Loading...'}
                  </span>
                  <span className="text-xs text-white/30">{progress.phase}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5">
                  <div
                    className="bg-accent-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent || 0}%` }}
                  />
                </div>
                <p className="text-xs text-white/30">{progress.message}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="glass p-4 border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
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

            {loading && (
              <button
                onClick={() => window.location.reload()}
                className="btn-ghost w-full text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
