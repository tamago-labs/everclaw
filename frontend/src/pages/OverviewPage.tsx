import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Boxes, Bot, CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react'
import { fetchKaneStatus, fetchJobs, type Job } from '../api'

export default function OverviewPage() {
  const [kane, setKane] = useState<any>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchKaneStatus().then(setKane).catch(() => setKane(null))
    fetchJobs().then((r) => setJobs(r.jobs)).catch(() => setJobs([]))
  }, [])

  const enabled = jobs.filter((j) => j.enabled).length
  const passed = jobs.filter((j) => j.lastStatus === 'passed').length
  const failed = jobs.filter((j) => j.lastStatus === 'failed' || j.lastStatus === 'error').length
  const waiting = jobs.filter((j) => j.lastStatus === 'waiting-model').length

  const cardCls = 'rounded-2xl p-5'
  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <motion.h1 className="text-2xl font-bold text-gradient-white mb-1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          Agent Control Center
        </motion.h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>Local AI + Kane CLI acting on the web.</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={cardCls} style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Boxes size={18} style={{ color: 'var(--color-accent-primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Kane CLI</span>
            </div>
            {!kane ? (
              <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Checking…</div>
            ) : (
              <div className="space-y-2 text-sm">
                <StatusRow icon={kane.available} label="Installed" value={kane.version || 'unknown'} />
                <StatusRow icon={kane.authenticated} label="Authenticated" value="" />
              </div>
            )}
          </div>

          <div className={cardCls} style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Bot size={18} style={{ color: 'var(--color-accent-primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Local AI</span>
            </div>
            <div className="space-y-2 text-sm">
              <StatusRow icon={!!(kane && kane.modelLoaded)} label="Model loaded" value="" />
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {kane && kane.modelLoaded ? 'Job pipeline can run end-to-end.' : 'Load a model in Chat to enable scheduled jobs.'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Jobs', value: jobs.length, color: 'var(--color-text-primary)' },
            { label: 'Enabled', value: enabled, color: 'rgba(251,191,36,0.9)' },
            { label: 'Passed', value: passed, color: '#00E68A' },
            { label: 'Failed', value: failed + waiting, color: '#F87171' },
          ].map((s) => (
            <div key={s.label} className={cardCls} style={cardStyle}>
              <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs uppercase tracking-wider mt-1 font-brand" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border-subtle)' }}>
          <div className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.15em] font-brand" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--color-text-muted)' }}>
            Jobs
          </div>
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No jobs yet. Create one to get started.</div>
          ) : (
            jobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-white/5"
                style={{ borderTop: '1px solid var(--color-border-subtle)' }}
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold font-mono truncate" style={{ color: 'var(--color-accent-primary)' }}>{job.name}</div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{job.mode} · {job.schedule || 'manual'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded-full" style={{
                    background: job.lastStatus === 'passed' ? 'rgba(0,230,138,0.12)' : job.lastStatus === 'failed' || job.lastStatus === 'error' ? 'rgba(239,68,68,0.12)' : job.lastStatus === 'waiting-model' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.06)',
                    color: job.lastStatus === 'passed' ? '#00E68A' : job.lastStatus === 'failed' || job.lastStatus === 'error' ? '#F87171' : 'var(--color-text-muted)',
                  }}>
                    {job.lastStatus || 'idle'}
                  </span>
                  <ArrowRight size={15} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatusRow({ icon, label, value }: { icon: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        {icon ? <CheckCircle2 size={14} style={{ color: '#00E68A' }} /> : <XCircle size={14} style={{ color: '#F87171' }} />}
        {label}
      </span>
      <span style={{ color: 'var(--color-text-muted)' }}>{value || (icon ? 'yes' : 'no')}</span>
    </div>
  )
}
