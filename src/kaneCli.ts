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
    const found = execSync('where kane-cli 2>nul || which kane-cli', { encoding: 'utf-8' }).trim().split('\n')[0]
    return found || 'kane-cli'
  } catch {
    return 'kane-cli'
  }
}

export function kaneStatus(): { available: boolean; version: string | null; authenticated: boolean } {
  try {
    const version = execSync('kane-cli --version', { encoding: 'utf-8' }).trim()
    let authenticated = false
    try {
      const who = execSync('kane-cli whoami', { encoding: 'utf-8' })
      authenticated = /authenticated/i.test(who)
    } catch {
      authenticated = false
    }
    return { available: true, version, authenticated }
  } catch {
    return { available: false, version: null, authenticated: false }
  }
}

// Spawn kane-cli and resolve with the parsed run_end summary.
export function runKane(objective: string, opts: KaneRunOptions = {}): Promise<KaneRunResult> {
  return new Promise((resolve, reject) => {
    const bin = whichKane()
    const args = ['run', objective, '--agent']
    if (opts.url) args.push('--url', opts.url)
    if (opts.maxSteps) args.push('--max-steps', String(opts.maxSteps))
    if (opts.timeout) args.push('--timeout', String(opts.timeout))
    if (opts.headless) args.push('--headless')
    if (opts.variables && Object.keys(opts.variables).length > 0) {
      args.push('--variables', JSON.stringify(opts.variables))
    }

    const child = spawn(bin, args, { env: { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT || 'everclaw' } })
    const logs: string[] = []
    let runEnd: any = null

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

    child.on('error', (err) => reject(new Error(`Failed to launch kane-cli: ${err.message}`)))

    child.on('close', (code) => {
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
