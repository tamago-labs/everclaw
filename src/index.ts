import express from 'express'
import path from 'path'
import fs from 'fs'
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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)
const PORT = Number(process.env.PORT) || 3001

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

server.listen(PORT, () => {
  console.log(`\n  🦞 Everclaw CLI running at http://localhost:${PORT}\n`)
})
