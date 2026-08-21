import fs from 'fs'
import path from 'path'

export type CronScheduleType = 'once' | '5m' | '1h' | 'daily' | 'cron'

export interface CronJob {
  id: string
  name: string
  objective: string
  url: string
  markdown: string
  schedule: {
    type: CronScheduleType
    expr?: string
    nextRun: string | null
  }
  enabled: boolean
  lastRun?: { at: string; status: 'completed' | 'failed' | 'running'; result?: 'passed' | 'failed'; duration?: number; detail?: string }
  createdAt: string
  updatedAt: string
}

interface StoreFile {
  version: number
  jobs: CronJob[]
}

function newId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function computeNextRun(type: CronScheduleType, expr?: string, from: Date = new Date()): string | null {
  if (type === 'once') return null
  if (type === '5m') return new Date(from.getTime() + 5 * 60 * 1000).toISOString()
  if (type === '1h') return new Date(from.getTime() + 60 * 60 * 1000).toISOString()
  if (type === 'daily') return new Date(from.getTime() + 24 * 60 * 60 * 1000).toISOString()
  if (type === 'cron' && expr) {
    // simple: every minute if expr is */1 * * * *, else fallback to 5m
    // Full cron parsing will be done in scheduler; here just set 5m ahead
    return new Date(from.getTime() + 5 * 60 * 1000).toISOString()
  }
  return null
}

export class CronStore {
  private storePath: string
  private state: StoreFile

  constructor(userDataPath: string) {
    this.storePath = path.join(userDataPath, 'cronJobs.json')
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true })
    this.state = this.load()
  }

  private load(): StoreFile {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'))
        if (Array.isArray(raw.jobs)) return { version: 1, jobs: raw.jobs }
      }
    } catch {}
    return { version: 1, jobs: [] }
  }

  private save() {
    fs.writeFileSync(this.storePath, JSON.stringify(this.state, null, 2))
  }

  getAll(): CronJob[] {
    return [...this.state.jobs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  getById(id: string): CronJob | undefined {
    return this.state.jobs.find((j) => j.id === id)
  }

  add(input: { name: string; objective?: string; url?: string; markdown?: string; schedule?: { type: CronScheduleType; expr?: string }; enabled?: boolean }): CronJob {
    const name = input.name.trim()
    if (!name) throw new Error('Name is required')
    const objective = (input.objective || '').trim()
    const url = (input.url || 'http://localhost:3001').trim()
    const providedMarkdown = (input.markdown || '').trim()
    if (!providedMarkdown && !objective) throw new Error('Objective or markdown is required')
    const markdown = providedMarkdown || `---\nmode: testing\nurl: ${url}\n---\n\n# ${name}\n\n${objective}\n`
    const type = input.schedule?.type || 'once'
    const expr = input.schedule?.expr
    const nextRun = computeNextRun(type, expr)
    const now = new Date().toISOString()
    const job: CronJob = {
      id: newId(),
      name,
      objective,
      url,
      markdown,
      schedule: { type, expr, nextRun },
      enabled: input.enabled !== false,
      createdAt: now,
      updatedAt: now,
    }
    this.state.jobs.push(job)
    this.save()
    return job
  }

  update(id: string, patch: { name?: string; objective?: string; url?: string; markdown?: string; schedule?: { type: CronScheduleType; expr?: string }; enabled?: boolean; lastRun?: CronJob['lastRun'] }): CronJob | null {
    const j = this.state.jobs.find((x) => x.id === id)
    if (!j) return null
    if (patch.name !== undefined) j.name = patch.name.trim()
    if (patch.objective !== undefined) j.objective = patch.objective.trim()
    if (patch.url !== undefined) j.url = patch.url.trim()
    if (patch.markdown !== undefined) j.markdown = patch.markdown
    if (patch.schedule !== undefined) {
      j.schedule.type = patch.schedule.type
      j.schedule.expr = patch.schedule.expr
      j.schedule.nextRun = computeNextRun(patch.schedule.type, patch.schedule.expr)
    }
    if (patch.enabled !== undefined) j.enabled = !!patch.enabled
    if (patch.lastRun !== undefined) j.lastRun = patch.lastRun
    j.updatedAt = new Date().toISOString()
    this.save()
    return j
  }

  remove(id: string): boolean {
    const idx = this.state.jobs.findIndex((j) => j.id === id)
    if (idx === -1) return false
    this.state.jobs.splice(idx, 1)
    this.save()
    return true
  }

  bumpNextRun(id: string) {
    const j = this.getById(id)
    if (!j || j.schedule.type === 'once') return
    j.schedule.nextRun = computeNextRun(j.schedule.type, j.schedule.expr)
    j.updatedAt = new Date().toISOString()
    this.save()
  }
}
