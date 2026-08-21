#!/usr/bin/env node
import express from 'express'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'

// --- QVAC SDK imports ---
import {
  QWEN3_1_7B_INST_Q4,
  QWEN3_4B_INST_Q4_K_M,
  GEMMA4_31B_MULTIMODAL_Q4_K_M,
  GEMMA4_4B_MULTIMODAL_Q4_K_M,
  loadModel,
  unloadModel,
  downloadAsset,
  cancel,
  deleteCache,
  ModelType,
  completion,
} from '@qvac/sdk'

import { ModelStore } from './modelStore.js'
import { SessionStore, type Message } from './sessionStore.js'
import { AgentStore } from './agentStore.js'
import { VariableStore } from './variableStore.js'
import { CronStore } from './cronStore.js'
import { getKaneStatus, startKaneStatusPolling } from './kaneCli.js'


// --- Log capture (ring buffer served via /api/logs) ---
const logBuffer: string[] = []
const LOG_MAX = 500

function captureLog(level: string, args: any[]) {
  const line = `[${new Date().toISOString()}] [${level}] ${args
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ')}`
  logBuffer.push(line)
  if (logBuffer.length > LOG_MAX) logBuffer.shift()
}

const _origLog = console.log.bind(console)
console.log = (...args: any[]) => { captureLog('info', args); _origLog(...args) }
const _origErr = console.error.bind(console)
console.error = (...args: any[]) => { captureLog('error', args); _origErr(...args) }
const _origWarn = console.warn.bind(console)
console.warn = (...args: any[]) => { captureLog('warn', args); _origWarn(...args) }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)
const PORT = Number(process.env.PORT) || 3001

// Active Kane runs for ask_user bridging (runId -> child)
const activeKaneRuns = new Map<string, any>()
let wssRef: WebSocketServer | null = null

// kane-cli runtime identity (inherited by every spawn)
process.env.KANE_CLI_USER_AGENT = process.env.KANE_CLI_USER_AGENT || 'everclaw'

app.use(express.json())

// Light request logger (skip noisy polls)
app.use((req, _res, next) => {
  if (req.url.startsWith('/api/ai/status') || req.url === '/api/health') return next()
  if (req.url.startsWith('/api/logs')) return next()
  console.log(`${req.method} ${req.url}`)
  next()
})

// --- QVAC Config ---
const userDataPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.everclaw')
const cacheDir = path.join(userDataPath, 'qvac-cache')

function ensureQvacConfig() {
  fs.mkdirSync(cacheDir, { recursive: true })
  const configPath = path.join(userDataPath, 'qvac.config.json')
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ cacheDirectory: cacheDir }))
  }
  process.env.QVAC_CONFIG_PATH = configPath
}

// --- Stores ---
const modelStore = new ModelStore(userDataPath)
const sessionStore = new SessionStore(userDataPath)
const agentStore = new AgentStore(userDataPath)
const variableStore = new VariableStore(userDataPath)
const cronStore = new CronStore(userDataPath)

// --- Registry Sources ---
const REGISTRY_SOURCES: Record<string, any> = {
  'qwen3-1.7b-instruct-q4': QWEN3_1_7B_INST_Q4,
  'qwen3-4b-instruct-q4-k-m': QWEN3_4B_INST_Q4_K_M,
  'gemma4-4b-q4-k-m': GEMMA4_4B_MULTIMODAL_Q4_K_M,
  'gemma4-31b-q4-k-m': GEMMA4_31B_MULTIMODAL_Q4_K_M,
}

// --- AI State ---
let currentModelId: string | null = null
let currentModelName: string | null = null
let loadedAt: number | null = null
let isLoading = false
let loadingProgress: any = null
let currentRequestId: string | null = null

interface AiConfig {
  ctx_size: 2048 | 4096 | 8192 | 16384
}

const activeConfig: AiConfig = { ctx_size: 8192 }

function buildModelConfig() {
  return { ctx_size: activeConfig.ctx_size }
}

// ============== REST API ==============

// Health
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// AI status
app.get('/api/ai/status', (_req, res) => {
  res.json({
    loaded: currentModelId !== null,
    model: currentModelId,
    modelName: currentModelName,
    loadedAt,
    config: activeConfig,
    isLoading,
    progress: loadingProgress,
  })
})

// List models
app.get('/api/ai/models', (_req, res) => {
  res.json({ models: modelStore.getAll(), config: activeConfig })
})


// Add custom model
app.post('/api/ai/models', (req, res) => {
  const { name, source, description } = req.body
  if (!name?.trim() || !source?.trim()) {
    res.status(400).json({ error: 'Name and source are required' })
    return
  }
  const m = modelStore.add({ name, source, description })
  console.log(`model add: ${m.id} "${m.name}" ${m.sourceKind}`)
  res.json(m)
})

// Remove custom model
app.delete('/api/ai/models/:id', (req, res) => {
  const ok = modelStore.remove(req.params.id)
  if (!ok) return res.status(400).json({ error: 'Cannot remove model' })
  console.log(`model remove: ${req.params.id}`)
  res.json({ ok: true })
})

// Set config
app.put('/api/ai/config', (req, res) => {
  const { ctx_size } = req.body
  if (ctx_size && [2048, 4096, 8192, 16384].includes(ctx_size)) {
    activeConfig.ctx_size = ctx_size
    console.log(`config ctx_size -> ${ctx_size}`)
  }
  res.json({ config: activeConfig })
})

// Load model (SSE progress)
app.post('/api/ai/load', async (req, res) => {
  const { modelId, ctx_size } = req.body
  console.log(`ai/load start: ${modelId} ctx=${ctx_size || activeConfig.ctx_size}`)
  if (isLoading) return res.status(409).json({ error: 'Model already loading' })

  const entry = modelStore.getById(modelId)
  if (!entry) return res.status(400).json({ error: `Unknown model: ${modelId}` })

  if (ctx_size) activeConfig.ctx_size = ctx_size

  if (currentModelId) {
    try { await unloadModel({ modelId: currentModelId }) } catch {}
    currentModelId = null
    currentModelName = null
    loadedAt = null
  }

  isLoading = true
  loadingProgress = { phase: 'starting', percent: 0 }

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
  const send = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    const requestId = `load-${Date.now()}`
    currentRequestId = requestId

    let loadedModelId: string

    if (entry.sourceKind === 'registry') {
      const modelSrc = REGISTRY_SOURCES[entry.id]
      if (!modelSrc) throw new Error(`No registry source: ${entry.id}`)
      send({ phase: 'loading', percent: 0, message: `Loading ${entry.name}...` })
      loadedModelId = await loadModel({ modelSrc, modelConfig: buildModelConfig(), onProgress: (p: any) => { loadingProgress = p; send(p) } })
    } else if (entry.sourceKind === 'file') {
      if (!fs.existsSync(entry.source)) throw new Error(`File not found: ${entry.source}`)
      send({ phase: 'loading', percent: 0, message: `Loading ${entry.name}...` })
      loadedModelId = await loadModel({ modelSrc: entry.source, modelType: ModelType.llamacppCompletion, modelConfig: buildModelConfig(), onProgress: (p: any) => { loadingProgress = p; send(p) } })
    } else {
      send({ phase: 'downloading', percent: 0, message: `Downloading ${entry.name}...` })
      await downloadAsset({ assetSrc: entry.source, onProgress: (p: any) => { loadingProgress = p; send({ ...p, phase: 'downloading' }) } })
      if (currentRequestId !== requestId) return
      send({ phase: 'loading', percent: 0, message: `Loading ${entry.name}...` })
      loadedModelId = await loadModel({ modelSrc: entry.source, modelType: ModelType.llamacppCompletion, modelConfig: buildModelConfig(), onProgress: (p: any) => { loadingProgress = p; send({ ...p, phase: 'loading' }) } })
    }

    if (currentRequestId !== requestId) return
    currentModelId = loadedModelId
    currentModelName = entry.name
    loadedAt = Date.now()
    isLoading = false
    loadingProgress = null
    currentRequestId = null
    console.log(`ai/load done: ${entry.name} -> ${loadedModelId}`)
    send({ phase: 'done', percent: 100, message: `${entry.name} loaded successfully` })
  } catch (err: any) {
    isLoading = false
    loadingProgress = null
    currentRequestId = null
    console.error(`ai/load error: ${err.message}`)
    send({ phase: 'error', percent: 0, message: err.message || 'Failed to load model' })
  } finally { res.end() }
})

// Unload
app.post('/api/ai/unload', async (_req, res) => {
  if (!currentModelId) return res.status(400).json({ error: 'No model loaded' })
  try { await unloadModel({ modelId: currentModelId }); currentModelId = null; currentModelName = null; loadedAt = null; res.json({ ok: true }) }
  catch (err: any) { res.status(500).json({ error: err.message }) }
})

// Cancel
app.post('/api/ai/cancel', (_req, res) => {
  if (currentRequestId) { cancel({ requestId: currentRequestId }); currentRequestId = null; isLoading = false; loadingProgress = null; res.json({ ok: true }) }
  else res.status(400).json({ error: 'Nothing to cancel' })
})

// ============== Session Routes ==============

app.get('/api/sessions', (_req, res) => {
  res.json({ sessions: sessionStore.list() })
})

app.post('/api/sessions', (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
  const s = sessionStore.create(name)
  console.log(`session create: ${s.id} "${s.name}"`)
  res.json(s)
})

app.delete('/api/sessions/:id', (req, res) => {
  if (req.params.id === 'main') return res.status(400).json({ error: 'CANNOT_DELETE_PINNED' })
  const ok = sessionStore.delete(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Session not found' })
  console.log(`session delete: ${req.params.id}`)
  res.json({ ok: true })
})

// Clear messages (keeps the session; allowed for the default session)
app.post('/api/sessions/:id/clear', (req, res) => {
  sessionStore.clearMessages(req.params.id)
  console.log(`session clear: ${req.params.id}`)
  res.json({ ok: true })
})

// --- Logs ---
app.get('/api/logs', (_req, res) => {
  res.json({ logs: logBuffer })
})

app.post('/api/logs/clear', (_req, res) => {
  logBuffer.length = 0
  res.json({ ok: true })
})

app.get('/api/sessions/:id', (req, res) => {
  const session = sessionStore.get(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json({ session, messages: sessionStore.getMessages(req.params.id) })
})

app.put('/api/sessions/:id', (req, res) => {
  const { messages } = req.body
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'Messages array required' })
  sessionStore.saveMessages(req.params.id, messages)
  res.json({ ok: true })
})

// ============== Agents ==============

app.get('/api/agents', (_req, res) => {
  res.json({ agents: agentStore.getAll() })
})

app.post('/api/agents', (req, res) => {
  const { name, description, systemPrompt } = req.body
  if (!name?.trim() || !systemPrompt?.trim()) {
    res.status(400).json({ error: 'Name and systemPrompt are required' })
    return
  }
  const agent = agentStore.add({ name, description, systemPrompt })
  console.log(`agent create: ${agent.id} "${agent.name}"`)
  res.json(agent)
})

app.get('/api/agents/:id', (req, res) => {
  const agent = agentStore.getById(req.params.id)
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  res.json(agent)
})

app.put('/api/agents/:id', (req, res) => {
  const { name, description, systemPrompt } = req.body
  const agent = agentStore.update(req.params.id, { name, description, systemPrompt })
  if (!agent) return res.status(404).json({ error: 'Agent not found' })
  console.log(`agent update: ${agent.id} "${agent.name}"`)
  res.json(agent)
})

app.delete('/api/agents/:id', (req, res) => {
  const ok = agentStore.remove(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Agent not found' })
  console.log(`agent delete: ${req.params.id}`)
  res.json({ ok: true })
})

// ============== Variables ==============

app.get('/api/variables', (_req, res) => {
  res.json({ variables: variableStore.getAll() })
})

app.post('/api/variables', (req, res) => {
  const { name, value, secret } = req.body
  if (!name?.trim() || value === undefined) return res.status(400).json({ error: 'name and value required' })
  try {
    const v = variableStore.add({ name, value, secret })
    console.log(`variable add: ${v.name} secret=${v.secret}`)
    res.json(v)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

app.put('/api/variables/:id', (req, res) => {
  const { name, value, secret } = req.body
  try {
    const v = variableStore.update(req.params.id, { name, value, secret })
    if (!v) return res.status(404).json({ error: 'Variable not found' })
    console.log(`variable update: ${v.name}`)
    res.json(v)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

app.delete('/api/variables/:id', (req, res) => {
  const ok = variableStore.remove(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Variable not found' })
  console.log(`variable delete: ${req.params.id}`)
  res.json({ ok: true })
})

// ============== Cron Jobs (kane testmd, serial queue, Cron: session) ==============

let cronRunning: string | null = null
const cronQueue: string[] = []

async function runCronJob(job: any): Promise<void> {
  const kaneStatus = getKaneStatus()
  if (!kaneStatus.available || !kaneStatus.authenticated) {
    console.warn(`cron skip ${job.id} — kane not ready`)
    cronStore.update(job.id, { lastRun: { at: new Date().toISOString(), status: 'failed' } })
    return
  }
  cronRunning = job.id
  cronStore.update(job.id, { lastRun: { at: new Date().toISOString(), status: 'running' } })
  console.log(`cron run start: ${job.id} "${job.name}"`)
  try {
    // Auto-generate markdown if missing (e.g. CLI-created job with no markdown)
    let md = job.markdown
    if (!md || !md.trim()) {
      const prompt = (job.objective || '').trim()
      if (prompt) {
        try {
          console.log(`cron ${job.id}: no markdown, generating from objective`)
          md = await generateKaneMarkdown(prompt, job.id)
          cronStore.update(job.id, { markdown: md })
        } catch (e: any) {
          console.warn(`cron ${job.id}: auto-generate failed: ${e.message}`)
        }
      }
    }
    if (!md || !md.trim()) {
      cronStore.update(job.id, { lastRun: { at: new Date().toISOString(), status: 'failed' } })
      console.warn(`cron run skip ${job.id}: no markdown and could not generate`)
      return
    }
    // Resolve {{uuid}} placeholders (not part of Variables) so testmd won't fail on unknown var
    const resolvedMd = md.replace(/\{\{\s*uuid\s*\}\}/gi, () => crypto.randomUUID())
    // Write markdown to temp file for testmd run
    const tmpMd = path.join(userDataPath, `cron-${job.id}-${Date.now()}_test.md`)
    fs.writeFileSync(tmpMd, resolvedMd)
    // Prefer the markdown's own frontmatter `url:` (so pasted known-good markdowns run as-is);
    // fall back to job.url, then localhost:3001.
    let runUrl = job.url && job.url.trim() ? job.url.trim() : 'http://localhost:3001'
    const fm = resolvedMd.match(/^---\s*\n([\s\S]*?)\n---/)
    if (fm) {
      const u = fm[1].match(/^\s*url\s*:\s*(\S+)\s*$/m)
      if (u && u[1]) runUrl = u[1] // pasted markdown's own url takes precedence
    }
    const kaneVars = variableStore.toKaneVariables()
    let varsPath: string | null = null
    const args = ['testmd', 'run', tmpMd, '--agent', '--url', runUrl, '--timeout', '600', '--headless']
    console.log(`cron ${job.id} runUrl=${runUrl} vars=${Object.keys(kaneVars).length} headless md=${md.length}b`)
    if (Object.keys(kaneVars).length > 0) {
      varsPath = path.join(userDataPath, `cron-vars-${job.id}-${Date.now()}.json`)
      fs.writeFileSync(varsPath, JSON.stringify(kaneVars))
      args.push('--variables-file', varsPath)
    }
    const { spawn } = await import('child_process')
    const child = spawn('kane-cli', args, { env: { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT || 'everclaw' }, shell: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let runEnd: any = null
    let shareUrl: string | null = null
    let overallStatus: string | null = null
    child.stdout.on('data', (c: Buffer) => {
      const t = c.toString()
      stdout += t
      for (const line of t.split('\n')) {
        const s = line.trim()
        if (!s) continue
        try {
          const o = JSON.parse(s)
          if (o.type === 'run_end') runEnd = o
          // testmd run reports its shareable Test Manager link via test_md_done / test_md_summary
          else if ((o.type === 'test_md_done' || o.type === 'test_md_summary') && o.share_url) shareUrl = o.share_url
          else if (o.type === 'test_md_done' && o.overall_status) overallStatus = o.overall_status
          else if (o.step !== undefined) console.log(`cron step ${o.step}: ${o.status} ${o.remark || ''}`.slice(0, 200))
          else if (o.type) console.log(`cron ${o.type}`)
        } catch {}
      }
    })
    child.stderr.on('data', (c: Buffer) => { stderr += c.toString() })
    await new Promise<void>((resolve) => {
      child.on('close', (code) => {
        if (code !== 0 && !runEnd) console.warn(`cron kane exit ${code} stderr=${stderr.slice(0, 800)}`)
        resolve()
      })
      child.on('error', () => resolve())
    })
    if (varsPath) try { fs.unlinkSync(varsPath) } catch {}
    try { fs.unlinkSync(tmpMd) } catch {}
    // Fallback parse runEnd
    if (!runEnd) {
      for (const l of stdout.trim().split('\n').reverse()) {
        try { const o = JSON.parse(l); if (o.type === 'run_end') { runEnd = o; break } } catch {}
      }
    }
    // testmd run exposes its shareable Test Manager link via test_md_done/test_md_summary (not run_end)
    if (runEnd && shareUrl) runEnd.test_url = shareUrl
    // Pipeline status: 'completed' = kane finished (run_end received), even if the test
    // scenario report itself failed. 'failed' is reserved for pipeline errors (no runEnd).
    const runCompleted = !!runEnd
    const status: 'completed' | 'failed' = runCompleted ? 'completed' : 'failed'
    const result: 'passed' | 'failed' | undefined = (overallStatus === 'passed' || runEnd?.status === 'passed') ? 'passed'
      : (overallStatus === 'failed' || runEnd?.status === 'failed') ? 'failed'
      : undefined
    const duration = runEnd?.duration
    // Build a debug detail string from run_end (steps / message / error)
    let detail = ''
    if (runEnd) {
      const steps: any[] | null = Array.isArray(runEnd.steps) ? runEnd.steps
        : Array.isArray(runEnd.result?.steps) ? runEnd.result.steps
        : Array.isArray(runEnd.scenario?.steps) ? runEnd.scenario.steps
        : null
      if (steps && steps.length) detail = steps.map((s: any, i: number) => `#${i + 1} ${s.status || '?'} ${s.remark || s.name || ''}`).join(' | ')
      else if (runEnd.message) detail = String(runEnd.message)
      else if (runEnd.error) detail = String(runEnd.error)
      else detail = JSON.stringify(runEnd).slice(0, 500)
    }
    if (!runCompleted) console.warn(`cron ${job.id} FAILED (no run_end): ${detail.slice(0, 1200) || stderr.slice(0, 400)}`)
    else console.log(`cron ${job.id} COMPLETED (${duration ?? '?'}s) test=${result}: ${detail.slice(0, 400)}`)
    cronStore.update(job.id, { lastRun: { at: new Date().toISOString(), status, result, duration, detail: detail.slice(0, 2000) } })
    // Bump nextRun if not once
    if (job.schedule.type !== 'once') cronStore.bumpNextRun(job.id)
    // Summarize + create Cron: session — detached so a failed scenario never blocks the queue
    if (runEnd) void summarizeCronRun(job, runEnd, status)
    console.log(`cron run done: ${job.id} ${status} ${duration ?? ''}s`)
  } finally {
    cronRunning = null
    // process next in queue serially
    if (cronQueue.length > 0) {
      const nextId = cronQueue.shift()!
      const nextJob = cronStore.getById(nextId)
      if (nextJob) setImmediate(() => runCronJob(nextJob))
      else if (cronQueue.length > 0) setImmediate(() => { const nid = cronQueue.shift()!; const nj = cronStore.getById(nid); if (nj) runCronJob(nj) })
    }
  }
}

// Detached: create a Cron: session from run_end and enrich it with an AI summary.
// Runs regardless of pass/fail so a failed scenario never blocks the queue.
async function summarizeCronRun(job: any, runEnd: any, status: string): Promise<void> {
  try {
    const session = sessionStore.create(`Cron: ${job.name}`)
    const now = new Date().toISOString()
    // User message mirrors chat kane mode: the objective/prompt (or a clear fallback), not "(generated)"
    const userContent = job.objective && job.objective.trim() ? job.objective.trim() : `Cron run: ${job.name}`
    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: userContent, timestamp: now }
    const aiMsgId = (Date.now() + 1).toString()
    // Primary content = Kane's own summary (the "link to kane-cli"), exactly like chat kane mode.
    // kaneMeta carries the full run_end so the Kane result card renders.
    const kaneSummary = runEnd.summary || runEnd.one_liner || 'Kane run completed'
    sessionStore.saveMessages(session.id, [
      userMsg,
      { id: aiMsgId, role: 'assistant' as const, content: kaneSummary, kaneMeta: runEnd, timestamp: now },
    ])
    // Optional local-AI refine (mirrors chat kane mode's second step); base stays Kane's summary
    if (currentModelId) {
      try {
        const sys = 'You are a translator. Input is Kane run_end JSON. Output a concise 2-4 line human summary. Include what was done, result (passed/failed), and any extracted values from final_state. No persona, limit 300 tokens.'
        const run = completion({ modelId: currentModelId, history: [{ role: 'system' as const, content: sys }, { role: 'user' as const, content: JSON.stringify(runEnd) }], stream: false, kvCache: false, captureThinking: true } as any)
        const out: any = await (run as any).text
        const cleaned = (typeof out === 'string' ? out : String(out)).replace(/<think>[\s\S]*?<\/think>/g, '').trim()
        if (cleaned) {
          const msgs = sessionStore.getMessages(session.id)
          const ai = msgs.find((m: any) => m.id === aiMsgId)
          if (ai) { ai.content = cleaned; sessionStore.saveMessages(session.id, msgs) }
        }
      } catch (e: any) {
        console.warn(`cron summarize refine skip: ${e.message}`)
      }
    }
    console.log(`cron session: ${session.id} Cron: ${job.name} ${status}`)
  } catch (e: any) {
    console.warn(`cron summarize skip: ${e.message}`)
  }
}

function enqueueCron(jobId: string) {
  const job = cronStore.getById(jobId)
  if (!job) return
  if (cronRunning === jobId) {
    // already running this exact job — queue one more run after it finishes
    if (!cronQueue.includes(jobId)) cronQueue.push(jobId)
    return
  }
  if (cronRunning) {
    // something else running — queue this one
    if (!cronQueue.includes(jobId)) cronQueue.push(jobId)
    return
  }
  // nothing running — start now (runCronJob sets cronRunning synchronously inside)
  runCronJob(job)
}

app.get('/api/cron', (_req, res) => {
  res.json({ jobs: cronStore.getAll(), running: cronRunning, queue: [...cronQueue] })
})

app.post('/api/cron', (req, res) => {
  const { name, objective, url, markdown, schedule, enabled } = req.body
  try {
    const job = cronStore.add({ name, objective, url, markdown, schedule, enabled })
    console.log(`cron add: ${job.id} "${job.name}" ${job.schedule.type}`)
    res.json(job)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
})

// Standalone generate (no job id) — for New Job drawer before create
async function generateKaneMarkdown(srcPrompt: string, runId: string): Promise<string> {
  const { spawn } = await import('child_process')
  // Step 1: generate snapshot — stream progress via WS (buffer incomplete lines across chunks)
  const child = spawn('kane-cli', ['generate', srcPrompt, '--agent'], { env: { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT || 'everclaw' }, shell: true, stdio: ['pipe', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  let lineBuf = ''
  child.stdout.on('data', (c: Buffer) => {
    const chunk = c.toString()
    stdout += chunk
    lineBuf += chunk
    let nl
    while ((nl = lineBuf.indexOf('\n')) !== -1) {
      const line = lineBuf.slice(0, nl).trim()
      lineBuf = lineBuf.slice(nl + 1)
      if (!line) continue
      try {
        const o = JSON.parse(line)
        if (o.type === 'generate_progress' && wssRef) wssRef.clients.forEach((ws: any) => { try { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'cron_generate_progress', runId, pct: o.pct })) } catch {} })
        if (o.type === 'generate_thinking' && wssRef) wssRef.clients.forEach((ws: any) => { try { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'cron_generate_thinking', runId })) } catch {} })
        if (o.type === 'generate_chat' && wssRef) wssRef.clients.forEach((ws: any) => { try { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'cron_generate_chat', runId, text: o.text })) } catch {} })
      } catch {}
    }
  })
  child.stderr.on('data', (c: Buffer) => { stderr += c.toString() })
  const code: number | null = await new Promise((resolve) => { child.on('close', resolve); child.on('error', () => resolve(1)) })
  if (code !== 0) throw new Error(stderr.slice(0, 1000) || `generate exited ${code}`)
  let reqId: string | null = null
  let markdown = ''
  let primarySid: string | null = null
  let primaryScode: string | null = null
  let primaryTitle: string | null = null
  let primaryCaseTitle: string | null = null
  for (const line of stdout.trim().split('\n')) {
    try {
      const o = JSON.parse(line)
      if (o.request_id) reqId = o.request_id
      if (o.requestId) reqId = o.requestId
      if (o.id) reqId = o.id
      // Capture the primary scenario/case identity so we can pick the right *_test.md later
      if (o.type === 'generate_snapshot' && Array.isArray(o.scenarios) && o.scenarios.length) {
        const s0 = o.scenarios[0]
        if (s0) {
          if (s0.sid) primarySid = String(s0.sid)
          if (s0.scode) primaryScode = String(s0.scode)
          if (s0.title) primaryTitle = String(s0.title)
          const c0 = s0.test_cases && s0.test_cases[0]
          if (c0 && c0.title) primaryCaseTitle = String(c0.title)
        }
      }
      if (o.type === 'generate_snapshot' && o.markdown) markdown = o.markdown
      if (o.snapshot?.markdown) markdown = o.snapshot.markdown
      if (o.data?.markdown) markdown = o.data.markdown
      if (o.markdown && typeof o.markdown === 'string' && o.markdown.includes('## ')) markdown = o.markdown
    } catch {}
  }
  // Step 2: if snapshot didn't contain markdown, try --save with reqId
  if (!markdown && reqId) {
    const child2 = spawn('kane-cli', ['generate', '--save', '--req', reqId, '--agent'], { env: { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT || 'everclaw' }, shell: true, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout2 = ''
    let stderr2 = ''
    let suiteDir: string | null = null
    let lineBuf2 = ''
    child2.stdout.on('data', (c: Buffer) => {
      const chunk = c.toString()
      stdout2 += chunk
      lineBuf2 += chunk
      let nl
      while ((nl = lineBuf2.indexOf('\n')) !== -1) {
        const line = lineBuf2.slice(0, nl).trim()
        lineBuf2 = lineBuf2.slice(nl + 1)
        if (!line) continue
        try {
          const o = JSON.parse(line)
          if (o.suite_dir) suiteDir = o.suite_dir
          if (o.suiteDir) suiteDir = o.suiteDir
          if (o.type === 'generate_save_result' && o.suite_dir) suiteDir = o.suite_dir
          if (o.type === 'generate_progress' && wssRef) wssRef.clients.forEach((ws: any) => { try { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'cron_generate_progress', runId, pct: o.pct })) } catch {} })
        } catch {}
      }
    })
    child2.stderr.on('data', (c: Buffer) => { stderr2 += c.toString() })
    const code2: number | null = await new Promise((resolve) => { child2.on('close', resolve); child2.on('error', () => resolve(1)) })
    // Kane may return "no functional test cases generated" (e.g. duplicate/vague prompt) — surface it
    if (stdout2.includes('no functional test cases')) {
      throw new Error('Kane produced no functional cases — try a more explicit objective, e.g. "navigate to https://www.thailandstarterkit.com/moving/living-in-phra-khanong/, assert the page loads, store the first paragraph text as \'first_paragraph\'"')
    }
    // Locate the *_test.md files written by THIS generate. kane's reported suite_dir can be a
    // path that was never created (e.g. .../tcg-<reqId>), so fall back to locating by request id
    // in the folder name, then to the most recently written files.
    const testRoot = path.join(process.cwd(), '.testmuai', 'tests')
    let candidateFiles: string[] = []
    const walkAdd = (dir: string, out: string[]) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isFile() && p.endsWith('_test.md')) out.push(p)
        else if (e.isDirectory()) walkAdd(p, out)
      }
    }
    // 1) reported suite_dir — only if it actually exists
    if (suiteDir && fs.existsSync(suiteDir)) {
      try { walkAdd(suiteDir, candidateFiles) } catch {}
    }
    // 2) folder whose name contains the request id (kane names suites <slug>-<reqId>)
    if (candidateFiles.length === 0 && reqId && fs.existsSync(testRoot)) {
      try {
        for (const d of fs.readdirSync(testRoot)) {
          const fp = path.join(testRoot, d)
          if (fs.statSync(fp).isDirectory() && d.includes(String(reqId))) { walkAdd(fp, candidateFiles); break }
        }
      } catch {}
    }
    // 3) newest _test.md files under .testmuai/tests modified within the last 3 minutes
    if (candidateFiles.length === 0 && fs.existsSync(testRoot)) {
      try {
        const now = Date.now()
        const all: { p: string; m: number }[] = []
        walkAddM(testRoot, all)
        function walkAddM(dir: string, out: { p: string; m: number }[]) {
          for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name)
            if (e.isFile() && p.endsWith('_test.md')) { try { out.push({ p, m: fs.statSync(p).mtimeMs }) } catch {} }
            else if (e.isDirectory()) walkAddM(p, out)
          }
        }
        candidateFiles = all.filter((x) => now - x.m < 180000).sort((a, b) => b.m - a.m).map((x) => x.p)
      } catch {}
    }
    // Pick the primary scenario's file: match sid / scode / title tokens against path+content,
    // scoped to this generate's candidates only (never across other prompts' suites).
    if (candidateFiles.length > 0) {
      const tokens: string[] = []
      if (primarySid) tokens.push(primarySid.toLowerCase())
      if (primaryScode) tokens.push(primaryScode.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
      if (primaryTitle) {
        for (const w of primaryTitle.toLowerCase().split(/[^a-z0-9]+/)) if (w.length > 3) tokens.push(w)
      }
      if (primaryCaseTitle) {
        for (const w of primaryCaseTitle.toLowerCase().split(/[^a-z0-9]+/)) if (w.length > 3) tokens.push(w)
      }
      let picked: string | null = null
      if (tokens.length > 1 || (tokens.length === 1 && tokens[0].length > 4)) {
        let bestScore = -1
        for (const f of candidateFiles) {
          try {
            const hay = (f + ' ' + fs.readFileSync(f, 'utf-8')).toLowerCase()
            let score = 0
            for (const t of tokens) if (t && hay.includes(t)) score++
            if (score > bestScore) { bestScore = score; picked = f }
          } catch {}
        }
        if (bestScore <= 0) picked = null
      }
      if (!picked) {
        // fallback: newest mtime first (candidates from paths 1-2 keep dir order; sort by mtime desc)
        const withM = candidateFiles.map((p) => { try { return { p, m: fs.statSync(p).mtimeMs } } catch { return { p, m: 0 } } })
        withM.sort((a, b) => b.m - a.m)
        picked = withM[0]?.p || candidateFiles[0]
      }
      if (picked) try { markdown = fs.readFileSync(picked, 'utf-8') } catch {}
    }
    if (!markdown) {
      for (const line of stdout2.trim().split('\n')) {
        try {
          const o = JSON.parse(line)
          if (o.markdown) markdown = o.markdown
          if (o.path && fs.existsSync(o.path)) try { markdown = fs.readFileSync(o.path, 'utf-8') } catch {}
        } catch {}
      }
    }
    if (!markdown && stdout2.trim().includes('## ')) markdown = stdout2.trim()
    if (code2 !== 0 && !markdown) throw new Error(stderr2.slice(0, 1000) || `generate --save exited ${code2}`)
  }
  if (!markdown) {
    const maybe = stdout.trim()
    if (maybe.includes('## ') || maybe.includes('mode:')) markdown = maybe
  }
  if (!markdown) throw new Error('No markdown from generate')
  return markdown
}

app.post('/api/cron/generate', async (req, res) => {
  const { prompt } = req.body as { prompt?: string }
  const srcPrompt = (prompt || '').trim()
  if (!srcPrompt) return res.status(400).json({ error: 'prompt required' })
  try {
    const previewRunId = `cron_preview_${Date.now()}`
    const markdown = await generateKaneMarkdown(srcPrompt, previewRunId)
    if (wssRef) wssRef.clients.forEach((ws: any) => { try { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'cron_generate_done', runId: previewRunId, markdown: markdown.slice(0, 200) })) } catch {} })
    const scriptsDir = path.join(__dirname, '..', 'scripts')
    try { fs.mkdirSync(scriptsDir, { recursive: true }) } catch {}
    const tmpPath = path.join(scriptsDir, `cron-preview-${Date.now()}_test.md`)
    try { fs.writeFileSync(tmpPath, markdown) } catch {}
    console.log(`cron generate preview: ${markdown.slice(0, 60)}...`)
    res.json({ ok: true, markdown, path: tmpPath })
  } catch (err: any) {
    if (wssRef) wssRef.clients.forEach((ws: any) => { try { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'cron_generate_error', runId: `cron_preview_${Date.now()}`, error: err.message })) } catch {} })
    res.status(500).json({ error: err.message })
  }
})

// Scheduler tick — auto-run enabled jobs (Once never auto, 5m/1h/daily/cron via nextRun)
setInterval(() => {
  const now = Date.now()
  for (const job of cronStore.getAll()) {
    if (!job.enabled || !job.schedule.nextRun) continue
    if (new Date(job.schedule.nextRun).getTime() <= now) {
      if (cronRunning === job.id || cronQueue.includes(job.id)) continue
      console.log(`cron scheduler trigger: ${job.id} "${job.name}" ${job.schedule.type}`)
      enqueueCron(job.id)
    }
  }
}, 30000)

app.get('/api/cron/:id', (req, res) => {
  const job = cronStore.getById(req.params.id)
  if (!job) return res.status(404).json({ error: 'Cron job not found' })
  res.json(job)
})

app.put('/api/cron/:id', (req, res) => {
  const { name, objective, url, markdown, schedule, enabled } = req.body
  const job = cronStore.update(req.params.id, { name, objective, url, markdown, schedule, enabled })
  if (!job) return res.status(404).json({ error: 'Cron job not found' })
  console.log(`cron update: ${job.id}`)
  res.json(job)
})

app.delete('/api/cron/:id', (req, res) => {
  const ok = cronStore.remove(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Cron job not found' })
  // remove from queue if queued
  const idx = cronQueue.indexOf(req.params.id)
  if (idx !== -1) cronQueue.splice(idx, 1)
  console.log(`cron delete: ${req.params.id}`)
  res.json({ ok: true })
})

app.post('/api/cron/:id/run', (req, res) => {
  const job = cronStore.getById(req.params.id)
  if (!job) return res.status(404).json({ error: 'Cron job not found' })
  const alreadyQueued = cronQueue.includes(job.id)
  const isRunning = cronRunning === job.id
  enqueueCron(job.id)
  console.log(`cron run queued: ${job.id} running=${cronRunning} queue=[${cronQueue.join(',')}]`)
  res.json({ ok: true, running: cronRunning, queue: [...cronQueue], alreadyQueued, isRunning })
})

app.post('/api/cron/:id/generate', async (req, res) => {
  const job = cronStore.getById(req.params.id)
  if (!job) return res.status(404).json({ error: 'Cron job not found' })
  const { prompt } = req.body as { prompt?: string }
  const srcPrompt = (prompt || job.objective || '').trim()
  if (!srcPrompt) return res.status(400).json({ error: 'prompt required' })
  try {
    const markdown = await generateKaneMarkdown(srcPrompt, job.id)
    const scriptsDir = path.join(__dirname, '..', 'scripts')
    try { fs.mkdirSync(scriptsDir, { recursive: true }) } catch {}
    const outPath = path.join(scriptsDir, `cron-${job.id}_test.md`)
    try { fs.writeFileSync(outPath, markdown) } catch {}
    const updated = cronStore.update(job.id, { markdown })
    console.log(`cron generate: ${job.id} -> ${outPath} ${markdown.slice(0, 60)}...`)
    res.json({ ok: true, markdown, path: outPath, job: updated })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ============== Kane run (slash /kane) ==============

app.post('/api/kane/run', async (req, res) => {
  const { objective, url, headless } = req.body as { objective: string; url?: string; headless?: boolean }
  if (!objective?.trim()) return res.status(400).json({ error: 'objective required' })
  const kaneStatus = getKaneStatus()
  if (!kaneStatus.available) return res.status(503).json({ error: 'Kane CLI not available' })
  if (!kaneStatus.authenticated) return res.status(401).json({ error: 'Kane not authenticated — run kane-cli login' })
  if (kaneStatus.balance && kaneStatus.balance.available < 5) return res.status(402).json({ error: `Low credits: ${kaneStatus.balance.available}` })
  const runId = `kane_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`
  const targetUrl = url || 'http://localhost:3001'
  // --headless default true as requested (was headed and caused focus freeze)
  const useHeadless = headless !== false
  const args = ['run', objective, '--agent', '--url', targetUrl, '--timeout', '600']
  if (useHeadless) args.push('--headless')
  // Composite local variables as {{name}} for kane --variables-file (avoids shell quoting of JSON)
  const kaneVars = variableStore.toKaneVariables()
  let tmpVarsPath: string | null = null
  const neededPlaceholders: string[] = [...new Set([...objective.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))]
  if (neededPlaceholders.length > 0) {
    const varStatuses = neededPlaceholders.map((name) => {
      const v = (kaneVars as any)[name]
      if (v) return `{{${name}}} found${v.secret ? ' (masked)' : ''}`
      return `{{${name}}} MISSING`
    })
    const hasMissing = varStatuses.some((s) => s.includes('MISSING'))
    const logFn = hasMissing ? console.warn.bind(console) : console.log.bind(console)
    logFn(`kane vars needed: ${varStatuses.join(', ')}`)
    if (hasMissing) console.warn(`kane vars hint: add missing variables in Variables page`)
  } else {
    console.log(`kane vars: none needed for this objective`)
  }
  if (Object.keys(kaneVars).length > 0) {
    const varsJson = JSON.stringify(kaneVars)
    const hasPlaceholders = Object.keys(kaneVars).some((k) => objective.includes(`{{${k}}}`))
    if (hasPlaceholders) console.log(`kane variables: ${Object.keys(kaneVars).join(', ')} (masked)`)
    else console.log(`kane vars file: ${Object.keys(kaneVars).length} vars stored but not used in objective`)
    tmpVarsPath = path.join(userDataPath, `kane-vars-${Date.now()}.json`)
    try { fs.writeFileSync(tmpVarsPath, varsJson) } catch {}
    args.push('--variables-file', tmpVarsPath)
  } else {
    console.log(`kane vars: none (no variables stored)`)
  }
  console.log(`kane run: ${objective.slice(0, 80)}... headless=${useHeadless}`)
  try {
    const { spawn } = await import('child_process')
    const child = spawn('kane-cli', args, {
      env: { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT || 'everclaw' },
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    activeKaneRuns.set(runId, child)
    let stdout = ''
    let stderr = ''
    let runEnd: any = null
    let askUserCancelTimer: NodeJS.Timeout | null = null
    const killTimer = setTimeout(() => {
      try { child.kill() } catch {}
    }, 620000)

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stdout += text
      for (const line of text.split('\n')) {
        const t = line.trim()
        if (!t) continue
        try {
          const obj = JSON.parse(t)
          if (obj.type === 'run_end') {
            runEnd = obj
            console.log(`kane run_end: ${obj.status} ${obj.duration}s`)
          } else if (obj.type === 'ask_user') {
            const question: string = obj.question || ''
            console.warn(`kane ask_user: Step ${obj.step_index ?? '?'} — ${question.slice(0, 200)}`)
            // Option B: allow sequential asks — each ask gets its own answer; if question asks for both, answer with combined value
            const qLower = question.toLowerCase()
            let answer: string | null = null
            const asksUsername = qLower.includes('username') || qLower.includes('email')
            const asksPassword = qLower.includes('password')
            if (asksUsername && asksPassword && (kaneVars as any)['username'] && (kaneVars as any)['password']) {
              // Kane asked for both at once — send as "username\npassword" (kane splits on whitespace/newline)
              answer = `${(kaneVars as any)['username'].value} ${(kaneVars as any)['password'].value}`
            } else {
              for (const name of neededPlaceholders) {
                if (qLower.includes(name.toLowerCase()) && (kaneVars as any)[name]) {
                  answer = (kaneVars as any)[name].value
                  break
                }
              }
              if (!answer) {
                if (qLower.includes('username') && (kaneVars as any)['username']) answer = (kaneVars as any)['username'].value
                else if (qLower.includes('email') && (kaneVars as any)['username']) answer = (kaneVars as any)['username'].value
                else if (qLower.includes('password') && (kaneVars as any)['password']) answer = (kaneVars as any)['password'].value
                else if (qLower.includes('api_key') && (kaneVars as any)['api_key']) answer = (kaneVars as any)['api_key'].value
              }
            }
            if (answer && child.stdin) {
              console.log(`kane ask_user auto-answer: ${question.slice(0, 60)} -> (masked)`)
              try { child.stdin.write(JSON.stringify({ type: 'user_response', answer }) + '\n') } catch {}
              if (askUserCancelTimer) { clearTimeout(askUserCancelTimer); askUserCancelTimer = null }
            } else {
              console.warn(`kane ask_user no auto-answer, will cancel in 20s if no frontend answer (add {{variable}} per cookbook)`)
              // Broadcast to frontend so loading indicator becomes prompt
              if (wssRef) {
                const payload = JSON.stringify({ type: 'kane_ask', runId, question, step: obj.step_index })
                wssRef.clients.forEach((c: any) => { try { if (c.readyState === 1) c.send(payload) } catch {} })
              }
              if (!askUserCancelTimer) {
                askUserCancelTimer = setTimeout(() => {
                  try { child.stdin.write(JSON.stringify({ type: 'cancel' }) + '\n') } catch {}
                  console.warn(`kane ask_user cancel sent`)
                  activeKaneRuns.delete(runId)
                }, 20000)
              }
            }
          } else if (obj.step !== undefined) {
            console.log(`kane step ${obj.step}: ${obj.status} ${obj.remark || ''}`.slice(0, 200))
          } else if (obj.type === 'bifurcation') {
            console.log(`kane bifurcation: ${obj.flows?.length || 0} flows`)
          } else if (obj.type) {
            console.log(`kane ${obj.type}`)
          }
        } catch {
          // Not JSON — ignore (progress without type handled above)
        }
      }
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('close', (code) => {
      clearTimeout(killTimer)
      if (askUserCancelTimer) clearTimeout(askUserCancelTimer)
      activeKaneRuns.delete(runId)
      if (tmpVarsPath) try { fs.unlinkSync(tmpVarsPath) } catch {}
      if (runEnd) {
        console.log(`kane run done: ${runEnd.status} ${runEnd.duration}s`)
        if (wssRef) wssRef.clients.forEach((c: any) => { try { if (c.readyState === 1) c.send(JSON.stringify({ type: 'kane_done', runId })) } catch {} })
        res.json(runEnd)
      } else if (code !== 0) {
        console.error(`kane run failed code=${code} stderr=${stderr.slice(0, 500)}`)
        res.status(500).json({ error: stderr.slice(0, 500) || `kane exited ${code}` })
      } else {
        // Fallback parse from buffered stdout
        const lines = stdout.trim().split('\n').filter(Boolean)
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const obj = JSON.parse(lines[i])
            if (obj.type === 'run_end') { runEnd = obj; break }
          } catch {}
        }
        if (runEnd) res.json(runEnd)
        else res.status(500).json({ error: 'No run_end from kane' })
      }
    })
    child.on('error', (err: any) => {
      clearTimeout(killTimer)
      console.error(`kane spawn error: ${err.message}`)
      res.status(500).json({ error: err.message })
    })
  } catch (err: any) {
    console.error(`kane run error: ${err.message}`)
    if (!res.headersSent) res.status(500).json({ error: err.message || 'kane run failed' })
  }
})

// Kane ask_user answer bridge (frontend -> child stdin)
app.post('/api/kane/respond', (req, res) => {
  const { runId, answer, cancel } = req.body as { runId?: string; answer?: string; cancel?: boolean }
  if (!runId) return res.status(400).json({ error: 'runId required' })
  const child: any = activeKaneRuns.get(runId)
  if (!child || !child.stdin) return res.status(404).json({ error: 'Run not found or already finished' })
  try {
    if (cancel) {
      child.stdin.write(JSON.stringify({ type: 'cancel' }) + '\n')
      console.log(`kane respond cancel: ${runId}`)
    } else if (answer !== undefined) {
      child.stdin.write(JSON.stringify({ type: 'user_response', answer }) + '\n')
      console.log(`kane respond answer: ${runId} -> (masked)`)
    }
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// One-shot JSON<>human translator (no persona, no session)
app.post('/api/ai/summarize', async (req, res) => {
  const { kaneJson, text } = req.body
  if (!currentModelId) return res.status(400).json({ error: 'No model loaded' })
  let systemPrompt: string
  let userContent: string
  if (kaneJson) {
    systemPrompt = 'You are a translator. Input is Kane run_end JSON. Output a concise 2-4 line human summary. Include what was done, result (passed/failed), and any extracted values from final_state. No persona, no extra formatting, plain paragraphs. Limit to 300 tokens.'
    userContent = typeof kaneJson === 'string' ? kaneJson : JSON.stringify(kaneJson)
  } else if (text) {
    systemPrompt = 'You are a translator. Input is human text. Output minimal JSON {objective, url}. No persona, no extra text.'
    userContent = text
  } else {
    return res.status(400).json({ error: 'kaneJson or text required' })
  }
  try {
    const run = completion({
      modelId: currentModelId,
      history: [{ role: 'system' as const, content: systemPrompt }, { role: 'user' as const, content: userContent }],
      stream: false,
      kvCache: false,
      captureThinking: true,
    } as any)
    const out = await (run as any).text
    const raw = typeof out === 'string' ? out : String(out)
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    res.json({ text: cleaned })
  } catch (err: any) {
    console.error(`summarize error: ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})

// ============== Kane status ==============

// Kane status
app.get('/api/kane/status', (_req, res) => {
  const status = getKaneStatus()
  res.json({
    ...status,
    modelLoaded: currentModelId !== null,
    modelName: currentModelName,
    uptime: loadedAt ? Math.floor((Date.now() - loadedAt) / 1000) : null,
  })
})

// ============== WebSocket ==============

const wss = new WebSocketServer({ server })
wssRef = wss

wss.on('connection', (ws, req) => {
  console.log('  WS client connected from', req.socket.remoteAddress)

  ws.on('error', (err) => {
    console.error('  WS error:', err.message)
  })

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      if (msg.type === 'chat') {
        const { message, sessionId, history, agentId } = msg

        if (!currentModelId) {
          console.warn('WS chat rejected: no model loaded')
          ws.send(JSON.stringify({ type: 'error', message: 'No model loaded' }))
          return
        }

        console.log(`WS chat start: session=${sessionId || '-'} agent=${agentId || 'default'} len=${String(message).length}`)
        // Build history array for QVAC — agent systemPrompt overrides default when provided
        const agent = agentId ? agentStore.getById(agentId) : null
        if (agentId && !agent) console.warn(`WS chat: unknown agent ${agentId}, using default prompt`)
        const systemContent = agent?.systemPrompt || 'You are Everclaw, a helpful AI assistant. Be concise and helpful.'
        const qvacHistory = [
          { role: 'system' as const, content: systemContent },
          ...(history || []).map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: message },
        ]

        try {
          const run = completion({
            modelId: currentModelId,
            history: qvacHistory,
            stream: true,
            kvCache: true,
            captureThinking: true,
          })

          let assistantContent = ''
          let thinkingContent = ''

          for await (const event of run.events) {
            if (ws.readyState !== WebSocket.OPEN) break

            if (event.type === 'thinkingDelta') {
              thinkingContent += event.text
              ws.send(JSON.stringify({ type: 'thinking', text: event.text }))
            } else if (event.type === 'contentDelta') {
              let text = event.text
              if (assistantContent.length === 0) {
                text = text.replace(/^[\s\n]+/, '')
              }
              if (text) {
                assistantContent += text
                ws.send(JSON.stringify({ type: 'token', text }))
              }
            } else if (event.type === 'completionDone') {
              if (event.stopReason === 'error' && event.error) {
                ws.send(JSON.stringify({ type: 'error', message: event.error.message }))
              }
            }
          }

          // Save messages to session
          if (sessionId) {
            const userMsg: Message = {
              id: Date.now().toString(),
              role: 'user',
              content: message,
              timestamp: new Date().toISOString(),
            }
            sessionStore.addMessage(sessionId, userMsg)

            if (assistantContent) {
              const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: assistantContent,
                thinking: thinkingContent || undefined,
                timestamp: new Date().toISOString(),
              }
              sessionStore.addMessage(sessionId, assistantMsg)
            }
          }

          console.log(`WS chat done: session=${sessionId || '-'} agent=${agent?.name || 'default'} tokens=${assistantContent.length} thinking=${thinkingContent.length}`)
          ws.send(JSON.stringify({ type: 'done' }))
        } catch (err: any) {
          console.error(`WS chat error: ${err.message}`)
          ws.send(JSON.stringify({ type: 'error', message: err.message || 'Completion failed' }))
        }
      } else if (msg.type === 'kane_answer') {
        const { runId, answer, cancel } = msg as any
        const child: any = activeKaneRuns.get(runId)
        if (!child || !child.stdin) {
          ws.send(JSON.stringify({ type: 'error', message: 'Run not found' }))
          return
        }
        if (cancel) {
          try { child.stdin.write(JSON.stringify({ type: 'cancel' }) + '\n') } catch {}
          console.log(`kane WS cancel: ${runId}`)
        } else {
          try { child.stdin.write(JSON.stringify({ type: 'user_response', answer }) + '\n') } catch {}
          console.log(`kane WS answer: ${runId} -> (masked)`)
        }
        ws.send(JSON.stringify({ type: 'kane_answer_ok', runId }))
      }
    } catch (err) {
      console.error('WS message error:', err)
    }
  })

  ws.on('close', () => console.log('  WS client disconnected'))
})

// ============== Serve Frontend ==============

const frontendDist = path.join(__dirname, '..', 'frontend', 'out')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')))
}

// ============== Start ==============

ensureQvacConfig()
startKaneStatusPolling()

server.listen(PORT, () => {
  console.log(`\n  🦞 Everclaw is running`)
  console.log(`     Web UI:  http://localhost:${PORT}`)
  console.log(`     API:     http://localhost:${PORT}/api\n`)
})
