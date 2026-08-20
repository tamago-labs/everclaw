import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Play, Pause, Trash2, RefreshCw, ChevronRight, Loader2 } from 'lucide-react'
import { fetchJobs, toggleJob, runJob, deleteJob, type Job, type JobStatus } from '../api'
import JobFormModal from '../components/jobs/JobFormModal'

function statusPill(status: JobStatus | null): { label: string; bg: string; color: string } {
  switch (status) {
    case 'running': return { label: 'Running', bg: 'rgba(245,158,11,0.12)', color: 'rgba(251,191,36,0.9)' }
    case 'passed': return { label: 'Passed', bg: 'rgba(0,230,138,0.12)', color: '#00E68A' }
    case 'failed': return { label: 'Failed', bg: 'rgba(239,68,68,0.12)', color: '#F87171' }
    case 'error': return { label: 'Error', bg: 'rgba(239,68,68,0.12)', color: '#F87171' }
    case 'waiting-model': return { label: 'Waiting model', bg: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }
    default: return { label: 'Idle', bg: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }
  }
}

function relative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Job | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try { const r = await fetchJobs(); setJobs(r.jobs) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleToggle = async (job: Job) => {
    await toggleJob(job.id)
    load()
  }
  const handleRun = async (job: Job) => {
    setRunning(job.id)
    try { await runJob(job.id) } finally { setRunning(null); load() }
  }
  const confirmDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try { await deleteJob(pendingDelete.id); setPendingDelete(null); await load() } finally { setBusy(false) }
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <motion.h1 className="text-2xl font-bold text-gradient-white" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            Jobs
          </motion.h1>
          <div className="flex gap-2">
            <button onClick={load} className="p-2.5 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)' }}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ color: '#0F1117', background: 'var(--color-accent-primary)' }}>
              <Plus size={16} /> New Job
            </button>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)' }}>
          <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_1.2fr] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.15em] font-brand" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-muted)' }}>
            <div>Name</div>
            <div>Type / Mode</div>
            <div>Status</div>
            <div>Last / Next</div>
            <div className="text-right">Actions</div>
          </div>

          {jobs.length === 0 && !loading && (
            <div className="p-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No jobs yet. Create one to automate a browser task.</div>
          )}

          {jobs.map((job, i) => {
            const pill = statusPill(job.lastStatus)
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_1.2fr] px-5 py-4 items-center cursor-pointer hover:bg-white/5"
                style={{ borderTop: '1px solid var(--color-border-subtle)' }}
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate font-mono" style={{ color: 'var(--color-accent-primary)' }}>{job.name}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{job.schedule || 'manual only'}</div>
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <div className="capitalize">{job.type}</div>
                  <div style={{ color: 'var(--color-text-muted)' }}>{job.mode}</div>
                </div>
                <div>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: pill.bg, color: pill.color }}>{pill.label}</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <div>{relative(job.lastRun)}</div>
                  <div>{job.nextRun ? new Date(job.nextRun).toLocaleString() : '—'}</div>
                </div>
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleToggle(job)} className="p-2 rounded-lg transition-all" title={job.enabled ? 'Pause' : 'Enable'} style={{ color: job.enabled ? 'rgba(251,191,36,0.9)' : 'var(--color-text-muted)', background: job.enabled ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)' }}>
                    {job.enabled ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <button onClick={() => handleRun(job)} className="p-2 rounded-lg transition-all" title="Run now" style={{ color: 'var(--color-accent-primary)', background: 'var(--color-accent-primary-dim)' }}>
                    {running === job.id ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                  </button>
                  <button onClick={() => setPendingDelete(job)} className="p-2 rounded-lg transition-all" title="Delete" style={{ color: '#F87171', background: 'rgba(239,68,68,0.12)' }}>
                    <Trash2 size={15} />
                  </button>
                  <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {showForm && <JobFormModal onSaved={() => { setShowForm(false); load() }} onClose={() => setShowForm(false)} />}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-2xl p-6 w-[360px]" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Delete job?</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>"<strong>{pendingDelete.name}</strong>" and its run history will be permanently deleted.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingDelete(null)} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
              <button onClick={confirmDelete} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: '#fff', background: '#EF4444' }}>{busy ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
