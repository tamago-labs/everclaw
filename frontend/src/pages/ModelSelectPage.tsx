import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, ChevronDown } from 'lucide-react'
import { useAI } from '../context/AIContext'
import { fetchModels, loadModelSSE, type ModelEntry } from '../api'

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
      <motion.div
        className="w-full max-w-[560px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="w-14 h-14 rounded-2xl bg-ev-accent flex items-center justify-center mx-auto mb-4"
            style={{ boxShadow: '0 0 20px rgba(0, 230, 138, 0.4)' }}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          >
            <Crown size={28} className="text-[#0F1117]" />
          </motion.div>
          <motion.h1
            className="text-2xl font-bold text-gradient-white mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Everclaw
          </motion.h1>
          <motion.p
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Choose a model to get started
          </motion.p>
        </div>

        {/* Model cards - 2 column grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {models.map((model, i) => (
            <motion.button
              key={model.id}
              disabled={loading}
              onClick={() => setSelectedId(model.id)}
              className="glass text-left p-4 transition-all duration-200 cursor-pointer"
              style={{
                borderColor: selectedId === model.id ? 'rgba(0, 230, 138, 0.5)' : undefined,
              }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="relative z-10">
                <div className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {model.name}
                </div>
                <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  {model.description}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {model.quantization} · {model.params}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Config panel */}
        <motion.div
          className="glass p-5 mb-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
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
        </motion.div>

        {/* Progress */}
        {progress && progress.phase !== 'done' && (
          <motion.div
            className="glass p-5 mb-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
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
                <motion.div
                  className="h-1.5 rounded-full"
                  style={{ background: 'var(--color-accent-primary)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percent || 0}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {progress.message && (
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{progress.message}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            className="p-3 rounded-xl text-sm mb-6"
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171' }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {error}
          </motion.div>
        )}

        {/* Load button */}
        <motion.button
          onClick={handleLoad}
          disabled={!selectedId || loading}
          className="btn-primary w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? 'Loading...' : selected ? `Load ${selected.name}` : 'Select a model'}
        </motion.button>

        {/* Download info */}
        <motion.p
          className="text-center text-xs mt-4"
          style={{ color: 'var(--color-accent-primary)', opacity: 0.7 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.7 }}
        >
          Initial download required. Subsequent uses will load from local cache.
        </motion.p>
      </motion.div>
    </div>
  )
}
