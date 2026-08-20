import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Trash2, Plus, X } from 'lucide-react'
import { useAI } from '../context/AIContext'
import { fetchModels, loadModelSSE, addCustomModel, removeCustomModel, type ModelEntry } from '../api'

type Tab = 'registry' | 'custom'

export default function ModelSelectPage() {
  const { refresh } = useAI()
  const [models, setModels] = useState<ModelEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [ctxSize, setCtxSize] = useState(8192)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('registry')
  const [showAddForm, setShowAddForm] = useState(false)

  const loadModels = () => fetchModels().then((r) => setModels(r.models))
  useEffect(() => { loadModels() }, [])

  const builtinModels = models.filter((m) => m.builtin)
  const customModels = models.filter((m) => !m.builtin)
  const displayModels = tab === 'registry' ? builtinModels : customModels
  const selected = models.find((m) => m.id === selectedId)

  const handleLoad = () => {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    setProgress({ phase: 'starting', percent: 0 })
    loadModelSSE(
      selectedId, ctxSize,
      (data) => setProgress(data),
      async () => { setLoading(false); setProgress(null); await refresh() },
      (msg) => { setLoading(false); setProgress(null); setError(msg) },
    )
  }

  const handleRemove = async (id: string) => {
    await removeCustomModel(id)
    if (selectedId === id) setSelectedId(null)
    await loadModels()
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

        {/* Tabs */}
        <motion.div
          className="flex gap-1 p-1 rounded-xl mb-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-default)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {(['registry', 'custom'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setShowAddForm(false) }}
              className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
              style={{
                background: tab === t ? 'var(--color-accent-primary-dim)' : 'transparent',
                color: tab === t ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
              }}
            >
              {t === 'registry' ? 'Registry' : 'Custom'}
            </button>
          ))}
        </motion.div>

        {/* Model cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <AnimatePresence mode="popLayout">
            {displayModels.map((model, i) => (
              <motion.button
                key={model.id}
                disabled={loading}
                onClick={() => setSelectedId(model.id)}
                className="glass text-left p-4 transition-all duration-200 cursor-pointer relative group"
                style={{
                  borderColor: selectedId === model.id ? 'rgba(0, 230, 138, 0.5)' : undefined,
                }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.97 }}
                layout
              >
                <div className="relative z-10">
                  <div className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    {model.name}
                  </div>
                  <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    {model.description || model.source}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {model.sourceKind === 'registry'
                      ? `${model.quantization} · ${model.params}`
                      : model.sourceKind === 'file'
                        ? 'Local file'
                        : 'URL download'
                    }
                  </div>
                </div>
                {/* Remove button for custom models */}
                {!model.builtin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(model.id) }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    style={{ background: 'rgba(239, 68, 68, 0.15)' }}
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                )}
              </motion.button>
            ))}
          </AnimatePresence>

          {/* Add custom model card */}
          {tab === 'custom' && !showAddForm && (
            <motion.button
              onClick={() => setShowAddForm(true)}
              className="glass text-left p-4 cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[100px]"
              style={{ borderStyle: 'dashed' }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={20} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Add custom model</span>
            </motion.button>
          )}
        </div>

        {/* Add Custom Model Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              className="glass p-5 mb-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Add Custom Model</h3>
                  <button onClick={() => setShowAddForm(false)} className="p-1 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
                    <X size={16} />
                  </button>
                </div>
                <AddCustomModelForm
                  onAdded={async () => {
                    setShowAddForm(false)
                    await loadModels()
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* Download estimate */}
        {selected && !loading && (
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {selected.sourceKind === 'registry' || selected.sourceKind === 'https' ? (
              <div className="space-y-1">
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {selected.sizeBytes
                    ? `~${(selected.sizeBytes / 1024 / 1024 / 1024).toFixed(1)} GB download`
                    : 'Download required'
                  }
                  {' · '}First run takes{' '}
                  {selected.sizeBytes && selected.sizeBytes < 2e9 ? '2-5 min' :
                   selected.sizeBytes && selected.sizeBytes < 6e9 ? '5-10 min' :
                   '15-30 min'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-accent-primary)', opacity: 0.6 }}>
                  Cached locally after first download
                </p>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Local file · Loads instantly
              </p>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

// --- Add Custom Model Form ---

function AddCustomModelForm({ onAdded }: { onAdded: () => void }) {
  const [mode, setMode] = useState<'url' | 'file'>('url')
  const [name, setName] = useState('')
  const [source, setSource] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0 &&
    ((mode === 'url' && /^https?:\/\//i.test(source.trim())) ||
     (mode === 'file' && source.trim().length > 0))

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await addCustomModel({ name: name.trim(), source: source.trim(), description: description.trim() || undefined })
      onAdded()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {(['url', 'file'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setSource('') }}
            className="flex-1 py-1.5 text-xs rounded-md font-medium transition-all"
            style={{
              background: mode === m ? 'var(--color-accent-primary-dim)' : 'transparent',
              color: mode === m ? 'var(--color-accent-primary)' : 'var(--color-text-muted)',
            }}
          >
            {m === 'url' ? 'URL' : 'File'}
          </button>
        ))}
      </div>

      {/* Name */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="My fine-tuned model"
        className="w-full px-3 py-2 text-sm rounded-xl outline-none"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--color-border-default)',
          color: 'var(--color-text-primary)',
        }}
      />

      {/* Source */}
      {mode === 'url' ? (
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="https://example.com/model.gguf"
          className="w-full px-3 py-2 text-sm rounded-xl outline-none font-mono"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--color-border-default)',
            color: 'var(--color-text-primary)',
          }}
        />
      ) : (
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="C:\models\my-model.gguf"
          className="w-full px-3 py-2 text-sm rounded-xl outline-none font-mono"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--color-border-default)',
            color: 'var(--color-text-primary)',
          }}
        />
      )}

      {/* Description */}
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full px-3 py-2 text-sm rounded-xl outline-none"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--color-border-default)',
          color: 'var(--color-text-primary)',
        }}
      />

      {error && (
        <p className="text-xs" style={{ color: '#F87171' }}>{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="btn-primary flex-1 text-sm py-2"
        >
          {submitting ? 'Adding...' : 'Add Model'}
        </button>
      </div>
    </div>
  )
}
