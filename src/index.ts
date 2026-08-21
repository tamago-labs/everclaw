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

// ============== Kane run (slash /kane) ==============

app.post('/api/kane/run', async (req, res) => {
  const { objective, url, headless } = req.body as { objective: string; url?: string; headless?: boolean }
  if (!objective?.trim()) return res.status(400).json({ error: 'objective required' })
  const kaneStatus = getKaneStatus()
  if (!kaneStatus.available) return res.status(503).json({ error: 'Kane CLI not available' })
  if (!kaneStatus.authenticated) return res.status(401).json({ error: 'Kane not authenticated — run kane-cli login' })
  if (kaneStatus.balance && kaneStatus.balance.available < 5) return res.status(402).json({ error: `Low credits: ${kaneStatus.balance.available}` })
  const targetUrl = url || 'http://localhost:3001'
  // --headless default true as requested (was headed and caused focus freeze)
  const useHeadless = headless !== false
  const args = ['run', objective, '--agent', '--url', targetUrl, '--timeout', '600']
  if (useHeadless) args.push('--headless')
  console.log(`kane run: ${objective.slice(0, 80)}... headless=${useHeadless}`)
  try {
    const { spawn } = await import('child_process')
    const child = spawn('kane-cli', args, {
      env: { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT || 'everclaw' },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let runEnd: any = null
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
      if (runEnd) {
        console.log(`kane run done: ${runEnd.status} ${runEnd.duration}s`)
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
