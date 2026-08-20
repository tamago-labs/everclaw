import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { createJob, updateJob, type Job } from '../../api'
import { JOB_TEMPLATES } from '../../jobTemplates'

interface Props {
  job?: Job | null
  onSaved: () => void
  onClose: () => void
}

const SCHEDULE_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily 9am', value: '0 9 * * *' },
  { label: 'Weekly Mon 8am', value: '0 8 * * 1' },
]

function extractPlaceholders(...texts: string[]): string[] {
  const set = new Set<string>()
  const re = /\{([^}]+)\}/g
  for (const t of texts) {
    let m
    while ((m = re.exec(t)) !== null) set.add(m[1].trim())
  }
  return [...set]
}

export default function JobFormModal({ job, onSaved, onClose }: Props) {
  const editing = !!job
  const [name, setName] = useState('')
  const [type, setType] = useState<Job['type']>('custom')
  const [mode, setMode] = useState<Job['mode']>('pipeline')
  const [objective, setObjective] = useState('')
  const [goal, setGoal] = useState('')
  const [prompt, setPrompt] = useState('')
  const [startUrl, setStartUrl] = useState('')
  const [schedule, setSchedule] = useState('')
  const [varValues, setVarValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const placeholders = useMemo(
    () => extractPlaceholders(objective, goal, prompt, startUrl),
    [objective, goal, prompt, startUrl],
  )

  useEffect(() => {
    if (job) {
      setName(job.name)
      setType(job.type)
      setMode(job.mode)
      setObjective(job.objective || '')
      setGoal(job.goal || '')
      setPrompt(job.prompt)
      setStartUrl(job.startUrl || '')
      setSchedule(job.schedule || '')
      setVarValues(job.variables || {})
    }
  }, [job])

  const applyTemplate = (t: typeof JOB_TEMPLATES[number]) => {
    setType(t.type)
    setMode(t.mode)
    setObjective(t.objective || '')
    setGoal(t.goal || '')
    setPrompt(t.prompt)
    setSchedule(t.defaultSchedule)
    if (!name.trim()) setName(t.label)
  }

  const handleSave = async () => {
    setError(null)
    if (!name.trim() || !prompt.trim()) { setError('Name and AI prompt are required'); return }
    if (mode === 'plan' && !goal.trim()) { setError('Goal is required in Plan mode'); return }
    if (mode === 'pipeline' && !objective.trim()) { setError('Objective is required in Pipeline mode'); return }

    let vars: Record<string, any> = {}
    for (const [k, v] of Object.entries(varValues)) {
      if (v.trim()) vars[k] = v.trim()
    }

    const payload: any = {
      name: name.trim(),
      mode,
      type,
      prompt: prompt.trim(),
      startUrl: startUrl.trim() || undefined,
      schedule: schedule.trim() || undefined,
      variables: vars,
    }
    if (mode === 'plan') payload.goal = goal.trim()
    else payload.objective = objective.trim()

    setBusy(true)
    try {
      if (editing && job) await updateJob(job.id, payload)
      else await createJob(payload)
      onSaved()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all'
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-default)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{editing ? 'Edit Job' : 'New Job'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Templates */}
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.15em] font-brand" style={{ color: 'var(--color-text-muted)' }}>Template</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {JOB_TEMPLATES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => applyTemplate(t)}
                  className="text-left rounded-xl p-3 transition-all"
                  style={{ background: type === t.type ? 'var(--color-accent-primary-dim)' : 'rgba(255,255,255,0.05)', border: `1px solid ${type === t.type ? 'var(--color-accent-primary)' : 'var(--color-border-subtle)'}` }}
                >
                  <div className="text-sm font-semibold" style={{ color: type === t.type ? 'var(--color-accent-primary)' : 'var(--color-text-primary)' }}>{t.label}</div>
                  <div className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--color-text-muted)' }}>{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-[0.15em] font-brand" style={{ color: 'var(--color-text-muted)' }}>Name</label>
            <input className={inputCls} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="My job" />
          </div>

          {/* Mode */}
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.15em] font-brand" style={{ color: 'var(--color-text-muted)' }}>Mode</label>
            <div className="flex gap-2 mt-2">
              {(['pipeline', 'plan'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                  style={{ color: mode === m ? '#0F1117' : 'var(--color-text-secondary)', background: mode === m ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.06)' }}
                >
                  {m === 'pipeline' ? 'Pipeline (fixed task)' : 'Plan (AI writes task)'}
                </button>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {mode === 'pipeline'
                ? 'Runs a fixed browser task, then AI analyzes the result.'
                : 'AI writes the browser task from your goal, runs it, then analyzes the result.'}
            </p>
          </div>

          {mode === 'pipeline' ? (
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.15em] font-brand" style={{ color: 'var(--color-text-muted)' }}>Browser task (kane-cli objective)</label>
              <input className={inputCls} style={inputStyle} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Go to {url} and ..." />
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.15em] font-brand" style={{ color: 'var(--color-text-muted)' }}>Goal</label>
              <input className={inputCls} style={inputStyle} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Find {query} on {store}" />
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-[0.15em] font-brand" style={{ color: 'var(--color-text-muted)' }}>AI processing instruction</label>
            <textarea className={inputCls} style={inputStyle} rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Summarize / compare / draft ..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.15em] font-brand" style={{ color: 'var(--color-text-muted)' }}>Start URL</label>
              <input className={inputCls} style={inputStyle} value={startUrl} onChange={(e) => setStartUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.15em] font-brand" style={{ color: 'var(--color-text-muted)' }}>Schedule (cron)</label>
              <input className={inputCls} style={inputStyle} value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="* * * * *" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {SCHEDULE_PRESETS.map((p) => (
              <button key={p.value} onClick={() => setSchedule(p.value)} className="px-2.5 py-1 rounded-lg text-xs" style={{ color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.06)' }}>
                {p.label}
              </button>
            ))}
          </div>

          {placeholders.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.15em] font-brand" style={{ color: 'var(--color-text-muted)' }}>Template variables</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {placeholders.map((ph) => (
                  <div key={ph}>
                    <label className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{`{${ph}}`}</label>
                    <input className={inputCls} style={inputStyle} value={varValues[ph] || ''} onChange={(e) => setVarValues((v) => ({ ...v, [ph]: e.target.value }))} placeholder={ph} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.06)' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-semibold transition-all" style={{ color: '#0F1117', background: 'var(--color-accent-primary)' }}>
              {busy ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
