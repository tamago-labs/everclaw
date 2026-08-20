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
import { getKaneStatus, startKaneStatusPolling, runKane } from './kaneCli.js'
import { JobStore, type Job } from './jobStore.js'
import { shouldRunNow, computeNextRun } from './cron.js'

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

// kane-cli runtime identity (inherited by every spawn)
process.env.KANE_CLI_USER_AGENT = process.env.KANE_CLI_USER_AGENT || 'everclaw'

app.use(express.json())

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
const jobStore = new JobStore(userDataPath)

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
  res.json(modelStore.add({ name, source, description }))
})

// Remove custom model
app.delete('/api/ai/models/:id', (req, res) => {
  const ok = modelStore.remove(req.params.id)
  if (!ok) return res.status(400).json({ error: 'Cannot remove model' })
  res.json({ ok: true })
})

// Set config
app.put('/api/ai/config', (req, res) => {
  const { ctx_size } = req.body
  if (ctx_size && [2048, 4096, 8192, 16384].includes(ctx_size)) {
    activeConfig.ctx_size = ctx_size
  }
  res.json({ config: activeConfig })
})

// Load model (SSE progress)
app.post('/api/ai/load', async (req, res) => {
  const { modelId, ctx_size } = req.body
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
    send({ phase: 'done', percent: 100, message: `${entry.name} loaded successfully` })
  } catch (err: any) {
    isLoading = false
    loadingProgress = null
    currentRequestId = null
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
  res.json(sessionStore.create(name))
})

app.delete('/api/sessions/:id', (req, res) => {
  if (req.params.id === 'main') return res.status(400).json({ error: 'CANNOT_DELETE_PINNED' })
  const ok = sessionStore.delete(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Session not found' })
  res.json({ ok: true })
})

// Clear messages (keeps the session; allowed for the default session)
app.post('/api/sessions/:id/clear', (req, res) => {
  sessionStore.clearMessages(req.params.id)
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

// ============== Jobs (AI-in-the-loop browser automation) ==============

function renderTemplate(tpl: string | undefined, vars: Record<string, any>): string {
  if (!tpl) return ''
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ''))
}

// Local-model completion (non-streaming, accumulated). Reuses the loaded QVAC model.
async function aiComplete(history: { role: string; content: string }[]): Promise<{ content: string; thinking: string }> {
  if (!currentModelId) throw new Error('No model loaded')
  const run = completion({
    modelId: currentModelId,
    history,
    stream: true,
    kvCache: true,
    captureThinking: true,
  })
  let content = ''
  let thinking = ''
  for await (const event of run.events) {
    if (event.type === 'thinkingDelta') thinking += event.text
    else if (event.type === 'contentDelta') content += event.text
    else if (event.type === 'completionDone') {
      if (event.stopReason === 'error' && event.error) throw new Error(event.error.message)
    }
  }
  return { content, thinking }
}

// Plan mode: AI writes the kane-cli objective from the high-level goal.
async function aiPlanObjective(job: Job): Promise<string> {
  const system = 'You convert a high-level goal into a single kane-cli browser objective string that an autonomous browser agent can execute. Respond with ONLY the objective text — no quotes, no commentary.'
  const user = `Goal: ${job.goal || ''}\nVariables: ${JSON.stringify(job.variables)}\nProduce the objective.`
  const { content } = await aiComplete([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])
  return content.replace(/^["']|["']$/g, '').split('\n')[0].trim()
}

// Both modes: AI processes the kane result per the job's prompt, with session context.
async function aiAnalyze(job: Job, kaneResult: { summary: string; oneLiner: string; logs: string[] }): Promise<{ output: string }> {
  const prior = sessionStore.getMessages(job.sessionId).map((m) => ({ role: m.role, content: m.content }))
  const kaneText = kaneResult.summary || kaneResult.oneLiner || kaneResult.logs.join('\n').slice(0, 4000)
  const userContent = `Browser task completed.\n\n--- KANE RESULT ---\n${kaneText}\n\n--- YOUR TASK ---\n${job.prompt}`
  const history = [
    { role: 'system', content: 'You are Everclaw, a helpful AI assistant that processes browser-automation results.' },
    ...prior,
    { role: 'user', content: userContent },
  ]
  const { content } = await aiComplete(history)
  sessionStore.addMessage(job.sessionId, {
    id: Date.now().toString(),
    role: 'user',
    content: userContent,
    timestamp: new Date().toISOString(),
  })
  sessionStore.addMessage(job.sessionId, {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
  })
  return { output: content }
}

// Two-stage pipeline: (plan→) kane run → AI analyze. Runs in background.
async function executeJob(jobId: string, runId: string): Promise<void> {
  const job = jobStore.get(jobId)
  if (!job) return
  try {
    if (!currentModelId) {
      jobStore.finishRun(jobId, runId, { status: 'waiting-model', error: 'No model loaded' })
      jobStore.update(jobId, { lastRun: new Date().toISOString(), lastStatus: 'waiting-model' })
      return
    }

    // 1. Determine the browser objective
    const vars = job.variables || {}
    let objective: string
    if (job.mode === 'plan') {
      objective = await aiPlanObjective(job)
    } else {
      objective = renderTemplate(job.objective, vars)
    }
    // Resolve a target URL: explicit startUrl, else a `url`/`website` variable.
    const targetUrl = renderTemplate(job.startUrl, vars) || vars.url || vars.website || ''
    if (!targetUrl) {
      jobStore.finishRun(jobId, runId, { status: 'error', error: 'No target URL: set the Start URL field or provide a {url} variable.' })
      jobStore.update(jobId, { lastRun: new Date().toISOString(), lastStatus: 'error' })
      return
    }
    jobStore.finishRun(jobId, runId, { kaneObjective: objective, aiPrompt: job.prompt })

    // 2. Browser stage (kane-cli)
    const kane = await runKane(objective, {
      url: targetUrl || undefined,
      headless: true,
    })

    // 3. AI analysis stage
    const analysis = await aiAnalyze(job, kane)

    jobStore.finishRun(jobId, runId, {
      status: kane.status === 'passed' ? 'passed' : kane.status === 'failed' ? 'failed' : 'error',
      kaneSummary: kane.summary,
      kaneDuration: kane.duration,
      steps: kane.steps,
      testUrl: kane.testUrl,
      kaneLogs: kane.logs,
      aiOutput: analysis.output,
      aiDuration: 0,
    })
    jobStore.update(jobId, {
      lastRun: new Date().toISOString(),
      lastStatus: kane.status === 'passed' ? 'passed' : 'failed',
    })

    // 4. Persist the AI-processed result into the job's session (like old everclaw)
    const ts = new Date().toISOString()
    sessionStore.addMessage(job.sessionId, {
      id: crypto.randomUUID(),
      role: 'user',
      content: `🤖 Job "${job.name}" ran${targetUrl ? `\nURL: ${targetUrl}` : ''}\nTask: ${objective}`,
      timestamp: ts,
    })
    sessionStore.addMessage(job.sessionId, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: analysis.output || kane.summary || '(no output)',
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    jobStore.finishRun(jobId, runId, { status: 'error', error: err.message || String(err) })
    jobStore.update(jobId, { lastRun: new Date().toISOString(), lastStatus: 'error' })
  }
}

const runningJobIds = new Set<string>()

function startJob(jobId: string): string | null {
  if (runningJobIds.has(jobId)) return null
  runningJobIds.add(jobId)
  const runId = jobStore.addRun(jobId, {})
  executeJob(jobId, runId)
    .catch((e) => console.error('[job] run failed:', e))
    .finally(() => runningJobIds.delete(jobId))
  return runId
}

// Cron scheduler: polls every 60s, runs enabled/due jobs. Gated on a loaded model.
function startScheduler() {
  const tick = () => {
    if (!currentModelId) return
    const now = new Date()
    for (const job of jobStore.list()) {
      if (!job.enabled || !job.schedule) continue
      const next = computeNextRun(job.schedule, now)
      if (next && job.nextRun !== next.toISOString()) {
        jobStore.update(job.id, { nextRun: next.toISOString() })
      }
      if (shouldRunNow(job.schedule, now)) {
        startJob(job.id)
      }
    }
  }
  tick()
  setInterval(tick, 60_000)
}

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

// Job CRUD
app.get('/api/jobs', (_req, res) => {
  res.json({ jobs: jobStore.list() })
})

app.get('/api/jobs/activity', (_req, res) => {
  const limit = 12
  const all: Array<any> = []
  for (const job of jobStore.list()) {
    for (const run of jobStore.getRuns(job.id)) {
      all.push({ ...run, jobName: job.name, jobId: job.id })
    }
  }
  all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  res.json({ runs: all.slice(0, limit) })
})

app.post('/api/jobs', (req, res) => {
  const { name, mode, type, objective, goal, prompt, startUrl, schedule, enabled, variables } = req.body
  if (!name?.trim() || !prompt?.trim()) return res.status(400).json({ error: 'name and prompt are required' })
  if (mode === 'plan' && !goal?.trim()) return res.status(400).json({ error: 'goal is required in plan mode' })
  if (mode === 'pipeline' && !objective?.trim()) return res.status(400).json({ error: 'objective is required in pipeline mode' })

  const session = sessionStore.create(`job: ${name}`)
  let job = jobStore.create({
    name: name.trim(),
    mode: mode === 'plan' ? 'plan' : 'pipeline',
    type: type || 'custom',
    objective: objective?.trim(),
    goal: goal?.trim(),
    prompt: prompt.trim(),
    startUrl: startUrl?.trim(),
    schedule: schedule?.trim() || undefined,
    enabled: enabled !== false,
    variables: variables || {},
    sessionId: session.id,
  })
  if (job.schedule) {
    const next = computeNextRun(job.schedule)
    if (next) job = jobStore.update(job.id, { nextRun: next.toISOString() }) ?? job
  }
  res.json({ job })
})

app.put('/api/jobs/:id', (req, res) => {
  const updated = jobStore.update(req.params.id, req.body)
  if (!updated) return res.status(404).json({ error: 'Job not found' })
  if (updated.schedule) {
    const next = computeNextRun(updated.schedule)
    if (next) jobStore.update(updated.id, { nextRun: next.toISOString() })
  }
  res.json({ job: updated })
})

app.delete('/api/jobs/:id', (req, res) => {
  const job = jobStore.get(req.params.id)
  if (!job) return res.status(404).json({ error: 'Job not found' })
  if (job.sessionId) {
    try { sessionStore.delete(job.sessionId) } catch {}
  }
  jobStore.delete(req.params.id)
  res.json({ ok: true })
})

app.post('/api/jobs/:id/toggle', (req, res) => {
  const job = jobStore.get(req.params.id)
  if (!job) return res.status(404).json({ error: 'Job not found' })
  const updated = jobStore.update(req.params.id, { enabled: !job.enabled })
  res.json({ job: updated })
})

app.post('/api/jobs/:id/run', (req, res) => {
  const job = jobStore.get(req.params.id)
  if (!job) return res.status(404).json({ error: 'Job not found' })
  const runId = startJob(job.id)
  if (!runId) return res.status(409).json({ error: 'Job already running' })
  res.json({ ok: true, runId, status: 'running' })
})

app.get('/api/jobs/:id/runs', (req, res) => {
  const job = jobStore.get(req.params.id)
  if (!job) return res.status(404).json({ error: 'Job not found' })
  res.json({ runs: jobStore.getRuns(req.params.id) })
})

// ============== WebSocket ==============

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  console.log('  WS client connected from', req.socket.remoteAddress)

  ws.on('error', (err) => {
    console.error('  WS error:', err.message)
  })

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      if (msg.type === 'chat') {
        const { message, sessionId, history } = msg

        if (!currentModelId) {
          ws.send(JSON.stringify({ type: 'error', message: 'No model loaded' }))
          return
        }

        // Build history array for QVAC
        const qvacHistory = [
          { role: 'system' as const, content: 'You are Everclaw, a helpful AI assistant. Be concise and helpful.' },
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

          ws.send(JSON.stringify({ type: 'done' }))
        } catch (err: any) {
          ws.send(JSON.stringify({ type: 'error', message: err.message || 'Completion failed' }))
        }
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
startScheduler()

server.listen(PORT, () => {
  console.log(`\n  🦞 Everclaw CLI running at http://localhost:${PORT}\n`)
})
