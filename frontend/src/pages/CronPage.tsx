import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Plus, Trash2, Play, Pencil, X, Check } from 'lucide-react'
import { fetchCronJobs, createCronJob, updateCronJob, deleteCronJob, runCronJob, generateCronMarkdown, generateCronPreview, type CronJob, type CronScheduleType } from '../api'
import GlassButton from '../components/common/GlassButton'

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(diff)
  const mins = Math.floor(abs / 60000)
  if (mins < 1) return diff > 0 ? 'in <1m' : 'just now'
  if (mins < 60) return diff > 0 ? `in ${mins}m` : `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return diff > 0 ? `in ${hrs}h` : `${hrs}h ago`
  return new Date(iso).toLocaleString()
}

function scheduleLabel(type: CronScheduleType, expr?: string): string {
  if (type === 'once') return 'Once'
  if (type === '5m') return 'Every 5m'
  if (type === '1h') return 'Every 1h'
  if (type === 'daily') return 'Daily'
  if (type === 'cron') return expr || 'Cron'
  return type
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<CronJob | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CronJob | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const r = await fetchCronJobs()
      setJobs(r.jobs)
      setRunning(r.running)
      setQueue(r.queue)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [])

  const handleRun = async (job: CronJob) => {
    try {
      await runCronJob(job.id)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await deleteCronJob(pendingDelete.id)
      setPendingDelete(null)
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <motion.h1 className="text-2xl font-bold text-gradient-white mb-1 flex items-center gap-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <Clock size={22} style={{ color: 'var(--color-accent-primary)' }} />
              Cron Jobs
              {jobs.length > 0 && <span className="text-sm font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--color-accent-primary-dim)', color: 'var(--color-accent-primary)' }}>{jobs.length}</span>}
            </motion.h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Automate tests on schedule — one at a time. Results appear in Sessions.
            </p>
          </div>
          <GlassButton icon={<Plus size={16} />} label="New Job" onClick={() => { setEditing(null); setDrawerOpen(true) }} />
        </div>

        {(running || queue.length > 0) && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-xs" style={{ background: 'rgba(0,230,138,0.08)', border: '1px solid rgba(0,230,138,0.2)', color: 'var(--color-accent-primary)' }}>
            <Clock size={14} />
            {running ? `Running: ${jobs.find((j) => j.id === running)?.name || running}` : 'Idle'} {queue.length > 0 && ` — ${queue.length} queued: ${queue.map((id) => jobs.find((j) => j.id === id)?.name || id).join(', ')}`}
          </div>
        )}

        {loading ? (
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
        ) : jobs.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 text-center">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border-default)' }}>
                <Clock size={20} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>No cron jobs yet</div>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Create a job from a <code>/kane</code> prompt — URL separate, schedule Once / 5m / 1h / Daily / Cron.</p>
              <button onClick={() => setDrawerOpen(true)} className="btn-primary text-sm">New Job</button>
            </div>
          </motion.div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)' }}>
            <div className="grid grid-cols-[1fr_110px_140px_110px_120px_180px] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.15em] font-brand" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-muted)' }}>
              <div>Job</div>
              <div className="text-center">Schedule</div>
              <div className="text-center">Next run</div>
              <div className="text-center">Status</div>
              <div className="text-center">Last</div>
              <div className="text-right">Actions</div>
            </div>
            <AnimatePresence mode="popLayout">
              {jobs.map((j, i) => (
                <motion.div
                  key={j.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  layout
                  className="grid grid-cols-[1fr_110px_140px_110px_120px_180px] px-5 py-4 items-center cursor-pointer hover:bg-white/[0.03] transition-colors"
                  style={{ borderTop: '1px solid var(--color-border-subtle)' }}
                  onClick={() => { setEditing(j); setDrawerOpen(true) }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{j.name}</div>
                    <div className="text-xs truncate font-mono" style={{ color: 'var(--color-text-muted)' }}>{j.objective.slice(0, 60)}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>{j.url}</div>
                  </div>
                  <div className="text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>{scheduleLabel(j.schedule.type, j.schedule.expr)}</div>
                  <div className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>{relativeTime(j.schedule.nextRun)}</div>
                  <div className="text-center">
                    {running === j.id ? (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(0,230,138,0.15)', color: '#00E68A' }}>running</span>
                    ) : queue.includes(j.id) ? (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>queued</span>
                    ) : j.enabled ? (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}>enabled</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-muted)', opacity: 0.6 }}>disabled</span>
                    )}
                  </div>
                  <div className="text-center text-xs" title={j.lastRun?.detail || undefined}>
                    {!j.lastRun ? '—' : j.lastRun.status === 'running' ? (
                      <span style={{ color: '#00E68A' }}>running</span>
                    ) : j.lastRun.status === 'failed' ? (
                      <span style={{ color: '#F87171' }}>error {j.lastRun.duration ? `${j.lastRun.duration}s` : ''}</span>
                    ) : (
                      <span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>done</span>
                        {j.lastRun.result && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]" style={{
                            background: j.lastRun.result === 'passed' ? 'rgba(0,230,138,0.15)' : 'rgba(248,113,113,0.15)',
                            color: j.lastRun.result === 'passed' ? '#00E68A' : '#F87171',
                          }}>{j.lastRun.result}</span>
                        )}
                        {j.lastRun.duration ? <span className="ml-1" style={{ color: 'var(--color-text-muted)' }}>{j.lastRun.duration}s</span> : null}
                      </span>
                    )}
                    {j.lastRun?.detail && j.lastRun.result === 'failed' && (
                      <div className="mt-0.5 text-[10px] leading-tight px-1 truncate" style={{ color: 'var(--color-text-muted)', opacity: 0.8 }}>{j.lastRun.detail}</div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <GlassButton icon={<Play size={14} />} iconOnly title="Run now" onClick={() => handleRun(j)} />
                    <GlassButton icon={<Pencil size={14} />} iconOnly title="Edit" onClick={() => { setEditing(j); setDrawerOpen(true) }} />
                    <GlassButton icon={<Trash2 size={14} />} variant="danger" iconOnly title="Delete" onClick={() => setPendingDelete(j)} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CronDrawer isOpen={drawerOpen} onClose={() => { setDrawerOpen(false); setEditing(null) }} onSaved={load} editing={editing} />

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-[360px]" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Delete cron job?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>"{pendingDelete.name}" will be permanently deleted.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingDelete(null)} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
              <button onClick={handleDelete} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#fff', background: '#EF4444' }}>{busy ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CronDrawer({ isOpen, onClose, onSaved, editing }: { isOpen: boolean; onClose: () => void; onSaved: () => void; editing: CronJob | null }) {
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [url, setUrl] = useState('http://localhost:3001')
  const [markdown, setMarkdown] = useState('')
  const [scheduleType, setScheduleType] = useState<CronScheduleType>('once')
  const [cronExpr, setCronExpr] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genPct, setGenPct] = useState<number | null>(null)
  const [genChat, setGenChat] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit')

  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setObjective(editing.objective)
      setUrl(editing.url)
      setMarkdown(editing.markdown)
      setScheduleType(editing.schedule.type)
      setCronExpr(editing.schedule.expr || '')
    } else {
      setName('')
      setObjective('')
      setUrl('http://localhost:3001')
      setMarkdown('')
      setScheduleType('once')
      setCronExpr('')
    }
    setError(null)
  }, [editing, isOpen])

  useEffect(() => {
    if (!isOpen || !generating) return
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = location.host
    const ws = new WebSocket(`${proto}//${wsHost}/ws`)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'cron_generate_progress' && typeof data.pct === 'number') setGenPct(data.pct)
        if (data.type === 'cron_generate_chat' && data.text) setGenChat(data.text.slice(0, 120))
        if (data.type === 'cron_generate_done') { setGenPct(100); setTimeout(() => setGenPct(null), 800) }
        if (data.type === 'cron_generate_error') setGenPct(null)
      } catch {}
    }
    return () => ws.close()
  }, [isOpen, generating])

  const canSubmit = name.trim().length > 0 && url.trim().length > 0 && (objective.trim().length > 0 || markdown.trim().length > 0)

  const handleGenerate = async () => {
    if (!objective.trim()) { setError('Objective required to generate'); return }
    setError(null)
    setGenerating(true)
    setGenPct(0)
    setGenChat(null)
    try {
      if (editing?.id) {
        const r = await generateCronMarkdown(editing.id, objective)
        setMarkdown(r.markdown)
        setPreviewTab('preview')
        onSaved()
      } else {
        const r = await generateCronPreview(objective)
        setMarkdown(r.markdown)
        setPreviewTab('preview')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || busy) return
    setError(null)
    setBusy(true)
    try {
      const schedule: any = { type: scheduleType }
      if (scheduleType === 'cron') schedule.expr = cronExpr.trim()
      if (editing) await updateCronJob(editing.id, { name: name.trim(), objective, url: url.trim(), markdown, schedule, enabled: true })
      else await createCronJob({ name: name.trim(), objective, url: url.trim(), markdown, schedule, enabled: true })
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={onClose}
        >
          <motion.div
            className="w-[560px] h-full overflow-y-auto p-6"
            initial={{ x: 560 }}
            animate={{ x: 0 }}
            exit={{ x: 560 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{ background: 'var(--color-bg-elevated)', borderLeft: '1px solid var(--color-border-default)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{editing ? 'Edit Cron Job' : 'New Cron Job'}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: 'var(--color-text-muted)' }}><X size={18} /></button>
            </div>
            {error && <div className="p-3 rounded-xl text-sm mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bsky post gm" className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>URL</label>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:3001 or https://bsky.app" className="w-full px-3 py-2 text-sm rounded-xl outline-none font-mono" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Prompt / Objective</label>
            <textarea value={objective} onChange={(e) => setObjective(e.target.value)} disabled={generating} placeholder="sign in with username {{username}} and password {{password}}, click New Post, type 'gm, friend from kane', click the Post button, save the post url as 'post_url'" rows={3} className="w-full px-3 py-2 text-sm rounded-xl outline-none font-mono disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }} />
            {generating && (() => {
              const isFinalizing = genPct === 100
              return (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-xs" style={{ color: isFinalizing ? '#00E68A' : 'var(--color-accent-primary)' }}>
                  {isFinalizing ? <Check size={12} /> : <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent-primary)', borderTopColor: 'transparent' }} />}
                  {isFinalizing ? 'Saving suite… 100%' : `Generating markdown… ${genPct !== null ? `${genPct}%` : ''}`}
                  {genChat && !isFinalizing ? ` — ${genChat}` : ''}
                </div>
                {genPct !== null && (
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full transition-all" style={{ width: `${genPct}%`, background: isFinalizing ? '#00E68A' : 'var(--color-accent-primary)' }} />
                  </div>
                )}
              </div>
              )
            })()}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Markdown (_test.md)</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleGenerate} disabled={generating || !objective.trim()} className="text-xs px-3 py-1 rounded-full font-medium disabled:opacity-40" style={{ background: generating ? 'rgba(255,255,255,0.06)' : 'var(--color-accent-primary)', color: generating ? 'var(--color-text-muted)' : '#0F1117' }}>
                  {generating ? 'Generating…' : 'AI Generate'}
                </button>
                <div className="flex rounded-full p-0.5 text-xs" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border-default)' }}>
                  <button type="button" onClick={() => setPreviewTab('edit')} className={`px-2.5 py-1 rounded-full font-medium ${previewTab === 'edit' ? 'bg-white/10' : ''}`} style={{ color: previewTab === 'edit' ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>Edit</button>
                  <button type="button" onClick={() => setPreviewTab('preview')} className={`px-2.5 py-1 rounded-full font-medium ${previewTab === 'preview' ? 'bg-white/10' : ''}`} style={{ color: previewTab === 'preview' ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>Preview</button>
                </div>
              </div>
            </div>
            {previewTab === 'edit' ? (
              <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} placeholder={"---\nmode: testing\nurl: " + url + "\n---\n\n# " + (name || 'Job') + "\n\n" + objective} rows={10} className="w-full px-3 py-2 text-xs rounded-xl outline-none font-mono" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }} />
            ) : (
              <div className="w-full p-3 rounded-xl text-xs font-mono max-h-[320px] overflow-y-auto space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-secondary)' }}>
                {markdown ? markdown.split('\n').filter((l) => l.startsWith('## ') || l.startsWith('# ') || l.startsWith('---') || l.trim().startsWith('mode:') || l.trim().startsWith('url:')).length > 0 ? (
                  <div className="space-y-2">
                    {markdown.split('\n').map((line, idx) => {
                      if (line.startsWith('## ')) return <div key={idx} className="px-2 py-1 rounded" style={{ background: 'rgba(0,230,138,0.08)', color: 'var(--color-accent-primary)' }}>{line}</div>
                      if (line.startsWith('# ')) return <div key={idx} className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{line}</div>
                      if (line.startsWith('---') || line.trim().startsWith('mode:') || line.trim().startsWith('url:')) return <div key={idx} className="opacity-60">{line}</div>
                      if (!line.trim()) return <div key={idx} className="h-1" />
                      return <div key={idx} className="opacity-80">{line}</div>
                    })}
                  </div>
                ) : (
                  <div className="opacity-60">No markdown yet — click AI Generate from your prompt, then edit.</div>
                ) : (
                  <div className="opacity-60">No markdown yet — click AI Generate.</div>
                )}
              </div>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>AI converts prompt via <code>kane-cli generate</code> → structured testmd like <code>scripts/*.md</code> — preview then edit.</p>
            <p className="text-xs mt-1" style={{ color: '#F59E0B' }}>Jobs run on their own and can&apos;t ask for input — if they do, they&apos;ll freeze.</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Schedule</label>
            <div className="flex flex-wrap gap-2">
              {(['once', '5m', '1h', 'daily', 'cron'] as CronScheduleType[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setScheduleType(opt)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium"
                  style={{
                    background: scheduleType === opt ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.06)',
                    color: scheduleType === opt ? '#0F1117' : 'var(--color-text-secondary)',
                    border: `1px solid ${scheduleType === opt ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                  }}
                >
                  {opt === 'once' ? 'Once' : opt === '5m' ? 'Every 5m' : opt === '1h' ? 'Every 1h' : opt === 'daily' ? 'Daily' : 'Custom cron'}
                </button>
              ))}
            </div>
          </div>

          {scheduleType === 'cron' && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Cron expression</label>
              <input type="text" value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} placeholder="*/5 * * * * (every 5m)" className="w-full px-3 py-2 text-sm rounded-xl outline-none font-mono" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }} />
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-default)' }}>Cancel</button>
            <button type="submit" disabled={!canSubmit || busy} className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40" style={{ background: 'var(--color-accent-primary)', color: '#0F1117' }}>{busy ? 'Saving…' : editing ? 'Save' : 'Create'}</button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
