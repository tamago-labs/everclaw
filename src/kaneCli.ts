import { execSync } from 'child_process'

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
  if (!value.available) console.warn('kane status: not available (kane-cli not found)')
  else if (!value.authenticated) console.warn('kane status: not authenticated (run kane-cli whoami / login)')
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


