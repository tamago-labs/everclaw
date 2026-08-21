import fs from 'fs'
import path from 'path'

export interface Agent {
  id: string
  name: string
  description?: string
  systemPrompt: string
  createdAt: string
  updatedAt: string
}

interface StoreFile {
  version: number
  agents: Agent[]
}

function newId(): string {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export class AgentStore {
  private storePath: string
  private state: StoreFile

  constructor(userDataPath: string) {
    this.storePath = path.join(userDataPath, 'agents.json')
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true })
    this.state = this.load()
  }

  private load(): StoreFile {
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'))
        if (Array.isArray(raw.agents)) return { version: 1, agents: raw.agents }
      }
    } catch {}
    return { version: 1, agents: [] }
  }

  private save() {
    fs.writeFileSync(this.storePath, JSON.stringify(this.state, null, 2))
  }

  getAll(): Agent[] {
    return [...this.state.agents].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }

  getById(id: string): Agent | undefined {
    return this.state.agents.find((a) => a.id === id)
  }

  add(input: { name: string; description?: string; systemPrompt: string }): Agent {
    const now = new Date().toISOString()
    const agent: Agent = {
      id: newId(),
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      systemPrompt: input.systemPrompt.trim(),
      createdAt: now,
      updatedAt: now,
    }
    this.state.agents.push(agent)
    this.save()
    return agent
  }

  update(id: string, patch: { name?: string; description?: string; systemPrompt?: string }): Agent | null {
    const agent = this.state.agents.find((a) => a.id === id)
    if (!agent) return null
    if (patch.name !== undefined) agent.name = patch.name.trim()
    if (patch.description !== undefined) agent.description = patch.description?.trim() || undefined
    if (patch.systemPrompt !== undefined) agent.systemPrompt = patch.systemPrompt.trim()
    agent.updatedAt = new Date().toISOString()
    this.save()
    return agent
  }

  remove(id: string): boolean {
    const idx = this.state.agents.findIndex((a) => a.id === id)
    if (idx === -1) return false
    this.state.agents.splice(idx, 1)
    this.save()
    return true
  }
}
