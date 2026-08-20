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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(express.json())

// --- QVAC Config ---
const userDataPath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.everclaw-new')
const cacheDir = path.join(userDataPath, 'qvac-cache')

function ensureQvacConfig() {
  fs.mkdirSync(cacheDir, { recursive: true })
  const configPath = path.join(userDataPath, 'qvac.config.json')
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ cacheDirectory: cacheDir }))
  }
  process.env.QVAC_CONFIG_PATH = configPath
}

// --- Model Registry ---
interface ModelEntry {
  id: string
  name: string
  source: string
  sourceKind: 'registry' | 'file' | 'https'
  params: string
  quantization: string
  sizeBytes: number
  description: string
}

const REGISTRY_SOURCES: Record<string, any> = {
  'qwen3-1.7b-instruct-q4': QWEN3_1_7B_INST_Q4,
  'qwen3-4b-instruct-q4-k-m': QWEN3_4B_INST_Q4_K_M,
  'gemma4-4b-q4-k-m': GEMMA4_4B_MULTIMODAL_Q4_K_M,
  'gemma4-31b-q4-k-m': GEMMA4_31B_MULTIMODAL_Q4_K_M,
}

const BUILTIN_MODELS: ModelEntry[] = [
  {
    id: 'qwen3-1.7b-instruct-q4',
    name: 'Qwen 1.7B',
    source: 'registry://qwen3-1.7b-instruct-q4',
    sourceKind: 'registry',
    params: '1.7B',
    quantization: 'Q4',
    sizeBytes: 1_056_782_912,
    description: 'Fast & lightweight. 4-8 GB RAM.',
  },
  {
    id: 'qwen3-4b-instruct-q4-k-m',
    name: 'Qwen 4B',
    source: 'registry://qwen3-4b-instruct-q4-k-m',
    sourceKind: 'registry',
    params: '4B',
    quantization: 'Q4_K_M',
    sizeBytes: 2_497_280_256,
    description: 'Balanced performance. 8 GB+ RAM.',
  },
  {
    id: 'gemma4-4b-q4-k-m',
    name: 'Gemma 4B',
    source: 'registry://gemma4-4b-q4-k-m',
    sourceKind: 'registry',
    params: '4B',
    quantization: 'Q4_K_M',
    sizeBytes: 5_405_168_384,
    description: 'Google Gemma 4B. 8-16 GB RAM.',
  },
  {
    id: 'gemma4-31b-q4-k-m',
    name: 'Gemma 31B',
    source: 'registry://gemma4-31b-q4-k-m',
    sourceKind: 'registry',
    params: '31B',
    quantization: 'Q4_K_M',
    sizeBytes: 19_598_488_192,
    description: 'Google Gemma 31B. 32 GB+ RAM.',
  },
]

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

// List available models
app.get('/api/ai/models', (_req, res) => {
  res.json({ models: BUILTIN_MODELS, config: activeConfig })
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

  const entry = BUILTIN_MODELS.find((m) => m.id === modelId)
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
    const modelSrc = REGISTRY_SOURCES[entry.id]
    if (!modelSrc) {
      throw new Error(`No registry source for model: ${entry.id}`)
    }

    sendProgress({ phase: 'loading', percent: 0, message: `Loading ${entry.name}...` })

    const requestId = `load-${Date.now()}`
    currentRequestId = requestId

    await loadModel({
      modelSrc,
      modelConfig: buildModelConfig(),
      onProgress: (progress: any) => {
        loadingProgress = progress
        sendProgress(progress)
      },
    })

    if (currentRequestId !== requestId) return // cancelled

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
