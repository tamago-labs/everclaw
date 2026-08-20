import fs from 'fs'
import path from 'path'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: string
}

export interface Session {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

interface SessionDir {
  info: Session
  messagesPath: string
}

function newId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export class SessionStore {
  private basePath: string

  constructor(userDataPath: string) {
    this.basePath = path.join(userDataPath, 'sessions')
    fs.mkdirSync(this.basePath, { recursive: true })
  }

  private sessionDir(id: string): string {
    return path.join(this.basePath, id)
  }

  private messagesPath(id: string): string {
    return path.join(this.sessionDir(id), 'messages.json')
  }

  private infoPath(id: string): string {
    return path.join(this.sessionDir(id), 'session.json')
  }

  private readMessages(id: string): Message[] {
    try {
      const p = this.messagesPath(id)
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {}
    return []
  }

  private writeMessages(id: string, messages: Message[]) {
    fs.mkdirSync(this.sessionDir(id), { recursive: true })
    fs.writeFileSync(this.messagesPath(id), JSON.stringify(messages, null, 2))
  }

  private readInfo(id: string): Session | null {
    try {
      const p = this.infoPath(id)
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch {}
    return null
  }

  private writeInfo(session: Session) {
    fs.mkdirSync(this.sessionDir(session.id), { recursive: true })
    fs.writeFileSync(this.infoPath(session.id), JSON.stringify(session, null, 2))
  }

  list(): Session[] {
    const sessions: Session[] = []
    try {
      for (const dir of fs.readdirSync(this.basePath)) {
        const info = this.readInfo(dir)
        if (info) sessions.push(info)
      }
    } catch {}
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    return sessions
  }

  get(id: string): Session | null {
    return this.readInfo(id)
  }

  create(name: string): Session {
    const id = newId()
    const now = new Date().toISOString()
    const session: Session = { id, name: name.trim(), createdAt: now, updatedAt: now }
    this.writeInfo(session)
    this.writeMessages(id, [])
    return session
  }

  delete(id: string): boolean {
    const dir = this.sessionDir(id)
    if (!fs.existsSync(dir)) return false
    fs.rmSync(dir, { recursive: true, force: true })
    return true
  }

  getMessages(id: string): Message[] {
    return this.readMessages(id)
  }

  saveMessages(id: string, messages: Message[]): void {
    this.writeMessages(id, messages)
    // Update updatedAt
    const info = this.readInfo(id)
    if (info) {
      info.updatedAt = new Date().toISOString()
      this.writeInfo(info)
    }
  }

  addMessage(id: string, message: Message): void {
    const messages = this.readMessages(id)
    messages.push(message)
    this.writeMessages(id, messages)
    // Update updatedAt
    const info = this.readInfo(id)
    if (info) {
      info.updatedAt = new Date().toISOString()
      this.writeInfo(info)
    }
  }
}
