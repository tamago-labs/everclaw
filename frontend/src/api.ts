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
  sourceKind: 'registry' | 'file' | 'https'
  params: string
  quantization: string
  sizeBytes: number
  description: string
}

export async function fetchAiStatus(): Promise<AiStatus> {
  const res = await fetch(`${API_BASE}/ai/status`)
  return res.json()
}

export async function fetchModels(): Promise<{ models: ModelEntry[]; config: any }> {
  const res = await fetch(`${API_BASE}/ai/models`)
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
