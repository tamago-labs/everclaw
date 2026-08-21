import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, X, Settings2, ChevronRight } from 'lucide-react'
import { useAI } from '../context/AIContext'
import { fetchModels, loadModelSSE, addCustomModel, removeCustomModel, type ModelEntry } from '../api'
import WelcomeCard from '../components/common/WelcomeCard'

export default function ModelSelectPage() {
  const { refresh } = useAI()
  const [models, setModels] = useState<ModelEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<any>(null)
  const [displayPercent, setDisplayPercent] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showCustomModal, setShowCustomModal] = useState(false)

  const loadModels = () => fetchModels().then((r) => setModels(r.models))
  useEffect(() => { loadModels() }, [])

  const builtinModels = models.filter((m) => m.builtin)
  const customModels = models.filter((m) => !m.builtin)
  const selected = models.find((m) => m.id === selectedId)
  const isCustomSelected = selected ? !selected.builtin : false

  const handleLoad = () => {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    setProgress({ phase: 'starting', percent: 0 })
    setDisplayPercent(8)
    loadModelSSE(
      selectedId, 8192,
      (data) => {
        setProgress(data)
        if (typeof data.percent === 'number' && data.percent > 0) {
          setDisplayPercent((prev) => Math.max(prev, Math.min(100, data.percent)))
        }
      },
      async () => { setLoading(false); setProgress(null); setDisplayPercent(0); await refresh() },
      (msg) => { setLoading(false); setProgress(null); setDisplayPercent(0); setError(msg) },
    )
  }

  // Simulated 0→30→50 when no real percent reported
  useEffect(() => {
    if (!loading || !progress) return
    const real = typeof progress.percent === 'number' ? progress.percent : 0
    if (real > 0) return // real progress drives displayPercent via onProgress
    const id = setInterval(() => {
      setDisplayPercent((prev) => {
        if (prev < 30) return Math.min(30, prev + 4)
        if (prev < 50) return Math.min(50, prev + 0.9)
        if (prev < 55) return Math.min(55, prev + 0.15)
        return prev
      })
    }, 320)
    return () => clearInterval(id)
  }, [loading, progress])

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
        <WelcomeCard />

        {/* Registry model cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <AnimatePresence mode="popLayout">
            {builtinModels.map((model, i) => (
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
                    {model.quantization} · {model.params}
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Custom models wide card - below 4 cards */}
        <motion.button
          onClick={() => setShowCustomModal(true)}
          className="glass w-full flex items-center justify-between p-4 mb-6 text-left cursor-pointer transition-all hover:border-[rgba(0,230,138,0.3)] group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.98 }}
          style={{ borderColor: isCustomSelected ? 'rgba(0, 230, 138, 0.5)' : undefined }}
        >
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border-default)' }}>
              <Settings2 size={16} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <div>
              <div className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                Custom Models
                {customModels.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-accent-primary-dim)', color: 'var(--color-accent-primary)' }}>
                    {customModels.length}
                  </span>
                )}
                {isCustomSelected && <span className="text-xs" style={{ color: 'var(--color-accent-primary)' }}>• {selected?.name}</span>}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {customModels.length === 0 ? 'Import from URL or local file' : 'Manage imported models'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <span className="text-xs hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>{customModels.length === 0 ? 'Add' : 'Manage'}</span>
            <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.button>

        {/* Custom models modal */}
        <AnimatePresence>
          {showCustomModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setShowCustomModal(false)}>
              <motion.div
                className="glass w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative z-10 flex flex-col max-h-[80vh]">
                  <div className="flex items-center justify-between p-5 pb-4 border-b shrink-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <div className="flex items-center gap-2">
                      <Settings2 size={16} style={{ color: 'var(--color-accent-primary)' }} />
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Custom Models</h3>
                      {customModels.length > 0 && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({customModels.length})</span>}
                    </div>
                    <button onClick={() => setShowCustomModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                      <X size={16} />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 p-5 space-y-5">
                    {/* List */}
                    {customModels.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Imported</div>
                        {customModels.map((model) => (
                          <div
                            key={model.id}
                            onClick={() => { setSelectedId(model.id); setShowCustomModal(false) }}
                            className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group hover:border-[rgba(0,230,138,0.3)]"
                            style={{
                              background: selectedId === model.id ? 'var(--color-accent-primary-dim)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${selectedId === model.id ? 'rgba(0,230,138,0.5)' : 'var(--color-border-default)'}`,
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{model.name}</div>
                              <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{model.description || model.source}</div>
                              <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{model.sourceKind === 'file' ? 'Local file' : 'URL download'}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              {selectedId === model.id && <span className="text-xs" style={{ color: 'var(--color-accent-primary)' }}>Selected</span>}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemove(model.id) }}
                                className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                                style={{ background: 'rgba(239, 68, 68, 0.15)' }}
                              >
                                <Trash2 size={14} className="text-red-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--color-border-default)' }}>
                        <Plus size={20} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No custom models yet</div>
                        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>Import from a URL or local .gguf file</div>
                      </div>
                    )}

                    {/* Import form */}
                    <div>
                      <div className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>Import new model</div>
                      <AddCustomModelForm
                        onAdded={async () => {
                          await loadModels()
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <motion.div
                  className="h-1.5 rounded-full"
                  style={{ background: 'var(--color-accent-primary)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percent && progress.percent > 0 ? progress.percent : displayPercent}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  {progress.percent && progress.percent > 0 ? `${Math.round(progress.percent)}%` : `${Math.round(displayPercent)}%`}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                  {displayPercent < 50 && !(progress.percent && progress.percent > 0) ? 'Working — hang tight' : progress.message ? '' : ''}
                </span>
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
                  {selected.sizeBytes && selected.sizeBytes < 2e9 ? '2-4 min' :
                   selected.sizeBytes && selected.sizeBytes < 6e9 ? '4-7 min' :
                   '6-10 min'}
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
