const API_BASE = '/api'

export interface AiStatus {
  loaded: boolean
  model: string | null
  modelName: string | null
  loadedAt: number | null
  config: { ctx_size: number }
  isLoading: boolean
  progress: any
}

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

export async function fetchAiStatus(): Promise<AiStatus> {
  const res = await fetch(`${API_BASE}/ai/status`)
  return res.json()
}

export async function fetchModels(): Promise<{ models: ModelEntry[]; config: any }> {
  const res = await fetch(`${API_BASE}/ai/models`)
  return res.json()
}

export async function addCustomModel(data: {
  name: string
  source: string
  description?: string
}): Promise<ModelEntry> {
  const res = await fetch(`${API_BASE}/ai/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to add model')
  }
  return res.json()
}

export async function removeCustomModel(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/ai/models/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to remove model')
  }
  return res.json()
}

export async function setAiConfig(ctx_size?: number): Promise<{ config: any }> {
  const res = await fetch(`${API_BASE}/ai/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ctx_size }),
  })
  return res.json()
}

export async function unloadModel(): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/ai/unload`, { method: 'POST' })
  return res.json()
}

export function loadModelSSE(
  modelId: string,
  ctx_size: number,
  onProgress: (data: any) => void,
  onDone: () => void,
  onError: (msg: string) => void,
) {
  const controller = new AbortController()

  fetch(`${API_BASE}/ai/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId, ctx_size }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json()
      onError(err.error || 'Failed to start loading')
      return
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.phase === 'done') {
              onDone()
            } else if (data.phase === 'error') {
              onError(data.message)
            } else {
              onProgress(data)
            }
          } catch {}
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      onError(err.message)
    }
  })

  return () => controller.abort()
}

// ============== Sessions ==============

export interface Session {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  messageCount?: number
  default?: boolean
}

export async function fetchSessions(): Promise<{ sessions: Session[] }> {
  const res = await fetch(`${API_BASE}/sessions`)
  return res.json()
}

export async function createSession(name: string): Promise<Session> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create session')
  }
  return res.json()
}

export async function deleteSession(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete session')
  }
  return res.json()
}

export async function clearSessionMessages(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/sessions/${id}/clear`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to clear session')
  }
  return res.json()
}

export async function getSession(id: string): Promise<{ session: Session; messages: any[] }> {
  const res = await fetch(`${API_BASE}/sessions/${id}`)
  if (!res.ok) throw new Error('Session not found')
  return res.json()
}

export async function saveSessionMessages(id: string, messages: any[]): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  return res.json()
}

// ============== Logs ==============

export async function fetchLogs(): Promise<{ logs: string[] }> {
  const res = await fetch(`${API_BASE}/logs`)
  return res.json()
}

export async function clearLogs(): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/logs/clear`, { method: 'POST' })
  return res.json()
}

// ============== Kane CLI ==============

export async function fetchKaneStatus(): Promise<{ available: boolean; version: string | null; authenticated: boolean; modelLoaded: boolean }> {
  const res = await fetch(`${API_BASE}/kane/status`)
  return res.json()
}
