import fs from 'fs'
import path from 'path'

export interface ModelEntry {
  id: string
  name: string
  source: string
  sourceKind: 'registry' | 'file' | 'https' | 'http'
  params?: string
  quantization?: string
  sizeBytes?: number
  description?: string
  builtin: boolean
  createdAt: string
}

interface StoreFile {
  version: number
  models: ModelEntry[]
}

function newId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function deriveSourceKind(source: string): ModelEntry['sourceKind'] {
  if (source.startsWith('registry://')) return 'registry'
  if (source.startsWith('https://')) return 'https'
  if (source.startsWith('http://')) return 'http'
  // Absolute path check
  if (source.length >= 2 && source[1] === ':') return 'file'
  if (source.startsWith('/') || source.startsWith('\\')) return 'file'
  return 'https'
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
    builtin: true,
    createdAt: new Date().toISOString(),
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
    builtin: true,
    createdAt: new Date().toISOString(),
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
    builtin: true,
    createdAt: new Date().toISOString(),
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
    builtin: true,
    createdAt: new Date().toISOString(),
  },
]

export class ModelStore {
  private storePath: string
  private state: StoreFile

  constructor(userDataPath: string) {
    this.storePath = path.join(userDataPath, 'models.json')
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true })
    this.state = this.load()
    this.syncBuiltins()
    this.save()
  }

  private load(): StoreFile {
    try {
      if (fs.existsSync(this.storePath)) {
        return JSON.parse(fs.readFileSync(this.storePath, 'utf-8'))
      }
    } catch {}
    return { version: 1, models: [] }
  }

  private save() {
    fs.writeFileSync(this.storePath, JSON.stringify(this.state, null, 2))
  }

  private syncBuiltins() {
    // Add any missing builtins, update metadata for existing ones
    for (const builtin of BUILTIN_MODELS) {
      const existing = this.state.models.find((m) => m.id === builtin.id)
      if (existing) {
        existing.description = builtin.description
        existing.params = builtin.params
        existing.quantization = builtin.quantization
        existing.sizeBytes = builtin.sizeBytes
      } else {
        this.state.models.unshift({ ...builtin })
      }
    }
  }

  getAll(): ModelEntry[] {
    return this.state.models
  }

  getById(id: string): ModelEntry | undefined {
    return this.state.models.find((m) => m.id === id)
  }

  add(input: { name: string; source: string; description?: string; params?: string; quantization?: string }): ModelEntry {
    const entry: ModelEntry = {
      id: newId(),
      name: input.name.trim(),
      source: input.source.trim(),
      sourceKind: deriveSourceKind(input.source),
      params: input.params?.trim(),
      quantization: input.quantization?.trim(),
      description: input.description?.trim(),
      builtin: false,
      createdAt: new Date().toISOString(),
    }
    this.state.models.push(entry)
    this.save()
    return entry
  }

  remove(id: string): boolean {
    const idx = this.state.models.findIndex((m) => m.id === id)
    if (idx === -1) return false
    if (this.state.models[idx].builtin) return false
    this.state.models.splice(idx, 1)
    this.save()
    return true
  }
}
