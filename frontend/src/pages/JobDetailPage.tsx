import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, Loader2, ExternalLink } from 'lucide-react'
import { fetchJobs, fetchJobRuns, runJob, type Job, type JobRun, type JobStatus } from '../api'
import JobFormModal from '../components/jobs/JobFormModal'

function statusPill(status: JobStatus | null): { label: string; bg: string; color: string } {
  switch (status) {
    case 'running': return { label: 'Running', bg: 'rgba(245,158,11,0.12)', color: 'rgba(251,191,36,0.9)' }
    case 'passed': return { label: 'Passed', bg: 'rgba(0,230,138,0.12)', color: '#00E68A' }
    case 'failed': case 'error': return { label: 'Failed', bg: 'rgba(239,68,68,0.12)', color: '#F87171' }
    case 'waiting-model': return { label: 'Waiting model', bg: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }
    default: return { label: 'Idle', bg: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }
  }
}

type Tab = 'output' | 'ai' | 'logs' | 'config'
const TABS: { id: Tab; label: string }[] = [
  { id: 'output', label: 'Output' },
  { id: 'ai', label: 'AI Analysis' },
  { id: 'logs', label: 'Logs' },
  { id: 'config', label: 'Config' },
]

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [runs, setRuns] = useState<JobRun[]>([])
  const [tab, setTab] = useState<Tab>('output')
  const [running, setRunning] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const load = async () => {
    const [jobsRes, runsRes] = await Promise.all([fetchJobs(), id ? fetchJobRuns(id) : Promise.resolve({ runs: [] })])
    setJob(jobsRes.jobs.find((j) => j.id === id) || null)
    setRuns(runsRes.runs)
  }
  useEffect(() => { load() }, [id])

  const handleRun = async () => {
    if (!id) return
    setRunning(true)
    try {
      await runJob(id)
      const poll = setInterval(async () => {
        try {
          const r = await fetchJobRuns(id)
          const latest = r.runs[0]
          const terminal = latest && latest.status !== 'running' && latest.status !== 'waiting-model'
          if (terminal) {
            clearInterval(poll)
            setRunning(false)
            load()
          }
        } catch {
          clearInterval(poll)
          setRunning(false)
          load()
        }
      }, 3000)
      setTimeout(() => { clearInterval(poll); setRunning(false); load() }, 180000)
    } catch {
      setRunning(false)
      load()
    }
  }
  if (!job) {
    return <div className="p-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading…</div>
  }

  const latest: JobRun | undefined = runs[0]
  const pill = statusPill(job.lastStatus)

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/jobs')} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft size={16} /> Back to Jobs
        </button>

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gradient-white font-mono">{job.name}</h1>
          <div className="flex gap-2">
            <button onClick={handleRun} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all" style={{ color: '#0F1117', background: 'var(--color-accent-primary)' }}>
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run now
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-6 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span className="px-2 py-0.5 rounded-full" style={{ background: pill.bg, color: pill.color }}>{pill.label}</span>
          <span className="capitalize">{job.type}</span>
          <span>· {job.mode}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-sm font-medium relative transition-all"
              style={{ color: tab === t.id ? 'var(--color-accent-primary)' : 'var(--color-text-muted)' }}
            >
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--color-accent-primary)' }} />}
            </button>
          ))}
        </div>

        {!latest && (
          <div className="rounded-xl p-8 text-center text-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>
            No runs yet. Click “Run now” to execute the pipeline.
          </div>
        )}

        {latest && tab === 'output' && (
          <div className="space-y-3">
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}>
              <div className="text-xs uppercase tracking-wider mb-1 font-brand" style={{ color: 'var(--color-text-muted)' }}>Browser task</div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>{latest.kaneObjective}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}>
              <div className="text-xs uppercase tracking-wider mb-1 font-brand" style={{ color: 'var(--color-text-muted)' }}>Kane result</div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>{latest.kaneSummary || '(no summary)'}</p>
            </div>
            {latest.testUrl && (
              <a href={latest.testUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-accent-primary)' }}>
                <ExternalLink size={14} /> Open in KaneAI Dashboard
              </a>
            )}
          </div>
        )}

        {latest && tab === 'ai' && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }}>
            <div className="text-xs uppercase tracking-wider mb-1 font-brand" style={{ color: 'var(--color-text-muted)' }}>AI-processed result</div>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>{latest.aiOutput || '(no output)'}</p>
          </div>
        )}

        {latest && tab === 'logs' && (
          <div className="rounded-xl p-4 h-[420px] overflow-auto font-mono text-xs leading-relaxed" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}>
            {latest.kaneLogs.length === 0 ? <span style={{ color: 'var(--color-text-muted)' }}>No logs.</span> : latest.kaneLogs.map((l, i) => <div key={i} className="whitespace-pre-wrap break-words">{l}</div>)}
          </div>
        )}

        {tab === 'config' && (
          <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}><span style={{ color: 'var(--color-text-muted)' }}>Mode</span><span style={{ color: 'var(--color-text-primary)' }} className="capitalize">{job.mode}</span></div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}><span style={{ color: 'var(--color-text-muted)' }}>{job.mode === 'plan' ? 'Goal' : 'Objective'}</span><span style={{ color: 'var(--color-text-primary)' }}>{job.mode === 'plan' ? job.goal : job.objective}</span></div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}><span style={{ color: 'var(--color-text-muted)' }}>Start URL</span><span style={{ color: 'var(--color-text-primary)' }}>{job.startUrl || '—'}</span></div>
            <div className="py-2"><span style={{ color: 'var(--color-text-muted)' }}>AI instruction</span><p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>{job.prompt}</p></div>
            <button onClick={() => setShowEdit(true)} className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold" style={{ color: '#0F1117', background: 'var(--color-accent-primary)' }}>Edit</button>
          </div>
        )}
      </div>

      {showEdit && <JobFormModal job={job} onSaved={() => { setShowEdit(false); load() }} onClose={() => setShowEdit(false)} />}
    </div>
  )
}
