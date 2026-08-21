import fs from 'fs'
import path from 'path'

export interface Variable {
  id: string
  name: string
  value: string
  secret: boolean
  createdAt: string
  updatedAt: string
}

interface StoreFile {
  version: number
  variables: Variable[]
}

function newId(): string {
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function isValidName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

export class VariableStore {
  private storePath: string
  private state: StoreFile

  constructor(userDataPath: string) {
    this.storePath = path.join(userDataPath, 'variables.json')
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true })
    this.state = this.load()
  }

  private load(): StoreFile {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'))
        if (Array.isArray(raw.variables)) return { version: 1, variables: raw.variables }
      }
    } catch {}
    return { version: 1, variables: [] }
  }

  private save() {
    fs.writeFileSync(this.storePath, JSON.stringify(this.state, null, 2))
  }

  getAll(): Variable[] {
    return [...this.state.variables].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  getById(id: string): Variable | undefined {
    return this.state.variables.find((v) => v.id === id)
  }

  getByName(name: string): Variable | undefined {
    return this.state.variables.find((v) => v.name === name)
  }

  add(input: { name: string; value: string; secret?: boolean }): Variable {
    const name = input.name.trim()
    if (!isValidName(name)) throw new Error('Invalid variable name (use letters, numbers, underscore, start with letter or underscore)')
    if (this.state.variables.some((v) => v.name === name)) throw new Error(`Variable "${name}" already exists`)
    const now = new Date().toISOString()
    const v: Variable = { id: newId(), name, value: input.value, secret: !!input.secret, createdAt: now, updatedAt: now }
    this.state.variables.push(v)
    this.save()
    return v
  }

  update(id: string, patch: { name?: string; value?: string; secret?: boolean }): Variable | null {
    const v = this.state.variables.find((x) => x.id === id)
    if (!v) return null
    if (patch.name !== undefined) {
      const n = patch.name.trim()
      if (!isValidName(n)) throw new Error('Invalid variable name')
      if (this.state.variables.some((x) => x.id !== id && x.name === n)) throw new Error(`Variable "${n}" already exists`)
      v.name = n
    }
    if (patch.value !== undefined) v.value = patch.value
    if (patch.secret !== undefined) v.secret = !!patch.secret
    v.updatedAt = new Date().toISOString()
    this.save()
    return v
  }

  remove(id: string): boolean {
    const idx = this.state.variables.findIndex((v) => v.id === id)
    if (idx === -1) return false
    this.state.variables.splice(idx, 1)
    this.save()
    return true
  }

  toKaneVariables(): Record<string, { value: string; secret?: boolean }> {
    const out: Record<string, { value: string; secret?: boolean }> = {}
    for (const v of this.state.variables) {
      out[v.name] = { value: v.value, ...(v.secret ? { secret: true } : {}) }
    }
    return out
  }
}
