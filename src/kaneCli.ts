import { spawn } from 'child_process'
import { execSync } from 'child_process'

export interface KaneRunOptions {
  url?: string
  maxSteps?: number
  timeout?: number
  headless?: boolean
  variables?: Record<string, any>
}

export interface KaneRunResult {
  status: 'passed' | 'failed' | 'error'
  summary: string
  oneLiner: string
  duration: number
  steps: number
  testUrl: string | null
  logs: string[]
  raw: any
}

function whichKane(): string {
  try {
    // Windows: kane-cli.cmd; others: kane-cli
    const found = execSync('where kane-cli 2>nul || which kane-cli', { encoding: 'utf-8' }).replace(/\r/g, '').trim().split('\n')[0].trim()
    return found || 'kane-cli'
  } catch {
    return 'kane-cli'
  }
}

export function kaneStatus(): { available: boolean; version: string | null; authenticated: boolean } {
  try {
    const version = execSync('kane-cli --version', { encoding: 'utf-8', timeout: 5000 }).trim()
    let authenticated = false
    try {
      const who = execSync('kane-cli whoami', { encoding: 'utf-8', timeout: 5000 })
      authenticated = /authenticated/i.test(who)
    } catch {
      authenticated = false
    }
    return { available: true, version, authenticated }
  } catch {
    return { available: false, version: null, authenticated: false }
  }
}

// --- Cached kane status (so the browser-agent UI never blocks on kane-cli) ---
const KANE_STATUS_TTL = 30_000
let cachedKaneStatus: { value: ReturnType<typeof kaneStatus>; ts: number } | null = null
let kanePollingStarted = false

export function refreshKaneStatus(): void {
  const value = kaneStatus()
  cachedKaneStatus = { value, ts: Date.now() }
}

export function getKaneStatus(): ReturnType<typeof kaneStatus> {
  if (cachedKaneStatus && Date.now() - cachedKaneStatus.ts < KANE_STATUS_TTL) {
    return cachedKaneStatus.value
  }
  refreshKaneStatus()
  return cachedKaneStatus!.value
}

export function startKaneStatusPolling(): void {
  if (kanePollingStarted) return
  kanePollingStarted = true
  refreshKaneStatus() // warm cache (fire-and-forget; first request is also safe)
  setInterval(refreshKaneStatus, KANE_STATUS_TTL)
}

// Spawn kane-cli and resolve with the parsed run_end summary.
export function runKane(objective: string, opts: KaneRunOptions = {}): Promise<KaneRunResult> {
  return new Promise((resolve, reject) => {
    const bin = whichKane()
    // Hard ceiling so a hung kane-cli can never lock a job forever.
    const timeoutSec = opts.timeout || 240
    const args = ['run', objective, '--agent']
    if (opts.url) args.push('--url', opts.url)
    if (opts.maxSteps) args.push('--max-steps', String(opts.maxSteps))
    args.push('--timeout', String(timeoutSec))
    if (opts.headless) args.push('--headless')
    if (opts.variables && Object.keys(opts.variables).length > 0) {
      args.push('--variables', JSON.stringify(opts.variables))
    }

    const child = spawn(bin, args, { shell: true, env: { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT || 'everclaw' } })
    const logs: string[] = []
    let runEnd: any = null
    let settled = false

    const handleLine = (line: string) => {
      const trimmed = line.trim()
      if (!trimmed) return
      logs.push(trimmed)
      try {
        const obj = JSON.parse(trimmed)
        if (obj && obj.type === 'run_end') runEnd = obj
      } catch {
        // Non-JSON line (prose output) — keep in logs.
      }
    }

    let stderrBuf = ''
    child.stdout.on('data', (d) => String(d).split('\n').forEach(handleLine))
    child.stderr.on('data', (d) => {
      stderrBuf += String(d)
      String(d).split('\n').forEach((l) => { if (l.trim()) logs.push(l.trim()) })
    })

    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(guard)
      reject(new Error(`Failed to launch kane-cli: ${err.message}`))
    })

    // Guard: if kane-cli never emits run_end within the timeout, kill it and fail.
    const guard = setTimeout(() => {
      if (settled) return
      settled = true
      try { child.kill('SIGKILL') } catch { /* ignore */ }
      reject(new Error(`kane-cli timed out after ${timeoutSec}s with no result`))
    }, timeoutSec * 1000 + 15000)

    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(guard)
      if (runEnd) {
        resolve({
          status: runEnd.status === 'passed' ? 'passed' : runEnd.status === 'failed' ? 'failed' : 'error',
          summary: runEnd.summary || runEnd.one_liner || '',
          oneLiner: runEnd.one_liner || '',
          duration: typeof runEnd.duration === 'number' ? runEnd.duration : 0,
          steps: Array.isArray(runEnd.steps) ? runEnd.steps.length : (typeof runEnd.steps === 'number' ? runEnd.steps : 0),
          testUrl: runEnd.test_url || null,
          logs,
          raw: runEnd,
        })
      } else if (code === 0) {
        reject(new Error(`kane-cli exited ${code} with no run_end event`))
      } else {
        reject(new Error(stderrBuf.trim() || `kane-cli exited with code ${code}`))
      }
    })
  })
}
