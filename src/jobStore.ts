import fs from 'fs'
import path from 'path'

export type JobMode = 'pipeline' | 'plan'
export type JobType = 'news-digest' | 'price-tracker' | 'job-scanner' | 'add-to-cart' | 'competitor-watch' | 'subscription-killer' | 'post-social' | 'custom'
export type JobStatus = 'waiting-model' | 'running' | 'passed' | 'failed' | 'error'

export interface Job {
  id: string
  name: string
  mode: JobMode
  type: JobType
  objective?: string
  goal?: string
  prompt: string
  startUrl?: string
  schedule?: string
  enabled: boolean
  variables: Record<string, any>
  sessionId: string
  createdAt: string
  lastRun: string | null
  nextRun: string | null
  lastStatus: JobStatus | null
}

export interface JobRun {
  id: string
  jobId: string
  status: JobStatus
  startedAt: string
  finishedAt: string | null
  kaneObjective: string
  kaneSummary: string
  kaneDuration: number
  steps: number
  testUrl: string | null
  kaneLogs: string[]
  aiPrompt: string
  aiOutput: string
  aiDuration: number
  error: string | null
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export class JobStore {
  private basePath: string

  constructor(userDataPath: string) {
    this.basePath = path.join(userDataPath, 'jobs')
    fs.mkdirSync(this.basePath, { recursive: true })
  }

  private jobDir(id: string) {
    return path.join(this.basePath, id)
  }
  private configPath(id: string) {
    return path.join(this.jobDir(id), 'config.json')
  }
  private runsDir(id: string) {
    return path.join(this.jobDir(id), 'runs')
  }
  private runPath(id: string, runId: string) {
    return path.join(this.runsDir(id), `${runId}.json`)
  }

  private readConfig(id: string): Job | null {
    try {
      const p = this.configPath(id)
      return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null
    } catch {
      return null
    }
  }
  private writeConfig(job: Job) {
    fs.mkdirSync(this.jobDir(job.id), { recursive: true })
    fs.writeFileSync(this.configPath(job.id), JSON.stringify(job, null, 2))
  }

  list(): Job[] {
    const out: Job[] = []
    try {
      for (const dir of fs.readdirSync(this.basePath)) {
        const job = this.readConfig(dir)
        if (job) out.push(job)
      }
    } catch {}
    out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return out
  }

  get(id: string): Job | null {
    return this.readConfig(id)
  }

  create(data: Omit<Job, 'id' | 'createdAt' | 'lastRun' | 'nextRun' | 'lastStatus'>): Job {
    const job: Job = {
      ...data,
      id: newId('job'),
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: null,
      lastStatus: null,
    }
    this.writeConfig(job)
    return job
  }

  update(id: string, patch: Partial<Job>): Job | null {
    const job = this.readConfig(id)
    if (!job) return null
    const updated = { ...job, ...patch, id: job.id }
    this.writeConfig(updated)
    return updated
  }

  delete(id: string): boolean {
    const dir = this.jobDir(id)
    if (!fs.existsSync(dir)) return false
    fs.rmSync(dir, { recursive: true, force: true })
    return true
  }

  // --- Runs ---
  addRun(jobId: string, partial: Partial<JobRun>): string {
    const runId = newId('run')
    const run: JobRun = {
      id: runId,
      jobId,
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      kaneObjective: '',
      kaneSummary: '',
      kaneDuration: 0,
      steps: 0,
      testUrl: null,
      kaneLogs: [],
      aiPrompt: '',
      aiOutput: '',
      aiDuration: 0,
      error: null,
      ...partial,
    }
    fs.mkdirSync(this.runsDir(jobId), { recursive: true })
    fs.writeFileSync(this.runPath(jobId, runId), JSON.stringify(run, null, 2))
    return runId
  }

  finishRun(jobId: string, runId: string, patch: Partial<JobRun>): void {
    const p = this.runPath(jobId, runId)
    let run: JobRun = { id: runId, jobId, status: 'running', startedAt: new Date().toISOString(), finishedAt: null, kaneObjective: '', kaneSummary: '', kaneDuration: 0, steps: 0, testUrl: null, kaneLogs: [], aiPrompt: '', aiOutput: '', aiDuration: 0, error: null }
    try {
      if (fs.existsSync(p)) run = JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {}
    const updated: JobRun = { ...run, ...patch, id: runId, jobId, finishedAt: new Date().toISOString() }
    fs.writeFileSync(p, JSON.stringify(updated, null, 2))
  }

  getRuns(jobId: string): JobRun[] {
    const dir = this.runsDir(jobId)
    const out: JobRun[] = []
    try {
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.json')) {
          try {
            out.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')))
          } catch {}
        }
      }
    } catch {}
    out.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    return out
  }

  getRun(jobId: string, runId: string): JobRun | null {
    const p = this.runPath(jobId, runId)
    try {
      return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null
    } catch {
      return null
    }
  }
}
