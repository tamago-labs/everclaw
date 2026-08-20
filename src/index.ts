import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

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
} from '@qvac/sdk'

import { ModelStore, type ModelEntry } from './modelStore.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
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

// --- Model Store ---
const modelStore = new ModelStore(userDataPath)

// --- Registry Sources (built-in only) ---
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

const activeConfig: AiConfig = {
  ctx_size: 8192,
}

function buildModelConfig() {
  return {
    ctx_size: activeConfig.ctx_size,
  }
}

// --- API Routes ---

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

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

// List all models (built-in + custom)
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
  const entry = modelStore.add({ name, source, description })
  res.json(entry)
})

// Remove custom model
app.delete('/api/ai/models/:id', (req, res) => {
  const ok = modelStore.remove(req.params.id)
  if (!ok) {
    res.status(400).json({ error: 'Cannot remove model (not found or built-in)' })
    return
  }
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

  if (isLoading) {
    res.status(409).json({ error: 'Model already loading' })
    return
  }

  const entry = modelStore.getById(modelId)
  if (!entry) {
    res.status(400).json({ error: `Unknown model: ${modelId}` })
    return
  }

  // Update config
  if (ctx_size) activeConfig.ctx_size = ctx_size

  // Unload previous if any
  if (currentModelId) {
    try { await unloadModel() } catch {}
    currentModelId = null
    currentModelName = null
    loadedAt = null
  }

  isLoading = true
  loadingProgress = { phase: 'starting', percent: 0 }

  // SSE setup
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })

  const sendProgress = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const requestId = `load-${Date.now()}`
    currentRequestId = requestId

    if (entry.sourceKind === 'registry') {
      // Registry model
      const modelSrc = REGISTRY_SOURCES[entry.id]
      if (!modelSrc) {
        throw new Error(`No registry source for model: ${entry.id}`)
      }
      sendProgress({ phase: 'loading', percent: 0, message: `Loading ${entry.name}...` })
      await loadModel({
        modelSrc,
        modelConfig: buildModelConfig(),
        onProgress: (progress: any) => {
          loadingProgress = progress
          sendProgress(progress)
        },
      })
    } else if (entry.sourceKind === 'file') {
      // Local .gguf file
      if (!fs.existsSync(entry.source)) {
        throw new Error(`File not found: ${entry.source}`)
      }
      sendProgress({ phase: 'loading', percent: 0, message: `Loading ${entry.name}...` })
      await loadModel({
        modelSrc: entry.source,
        modelType: ModelType.llamacppCompletion,
        modelConfig: buildModelConfig(),
        onProgress: (progress: any) => {
          loadingProgress = progress
          sendProgress(progress)
        },
      })
    } else {
      // HTTPS/HTTP — download then load
      sendProgress({ phase: 'downloading', percent: 0, message: `Downloading ${entry.name}...` })
      await downloadAsset({
        assetSrc: entry.source,
        onProgress: (progress: any) => {
          loadingProgress = progress
          sendProgress({ ...progress, phase: 'downloading' })
        },
      })

      if (currentRequestId !== requestId) return

      sendProgress({ phase: 'loading', percent: 0, message: `Loading ${entry.name}...` })
      await loadModel({
        modelSrc: entry.source,
        modelType: ModelType.llamacppCompletion,
        modelConfig: buildModelConfig(),
        onProgress: (progress: any) => {
          loadingProgress = progress
          sendProgress({ ...progress, phase: 'loading' })
        },
      })
    }

    if (currentRequestId !== requestId) return

    currentModelId = entry.id
    currentModelName = entry.name
    loadedAt = Date.now()
    isLoading = false
    loadingProgress = null
    currentRequestId = null

    sendProgress({ phase: 'done', percent: 100, message: `${entry.name} loaded successfully` })
  } catch (err: any) {
    isLoading = false
    loadingProgress = null
    currentRequestId = null
    sendProgress({ phase: 'error', percent: 0, message: err.message || 'Failed to load model' })
  } finally {
    res.end()
  }
})

// Unload model
app.post('/api/ai/unload', async (_req, res) => {
  if (!currentModelId) {
    res.status(400).json({ error: 'No model loaded' })
    return
  }
  try {
    await unloadModel()
    currentModelId = null
    currentModelName = null
    loadedAt = null
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Cancel loading
app.post('/api/ai/cancel', (_req, res) => {
  if (currentRequestId) {
    cancel({ requestId: currentRequestId })
    currentRequestId = null
    isLoading = false
    loadingProgress = null
    res.json({ ok: true })
  } else {
    res.status(400).json({ error: 'Nothing to cancel' })
  }
})

// --- Serve Frontend ---
const frontendDist = path.join(__dirname, '..', 'frontend', 'out')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

// --- Start ---
ensureQvacConfig()

app.listen(PORT, () => {
  console.log(`\n  🦞 Everclaw CLI running at http://localhost:${PORT}\n`)
})
