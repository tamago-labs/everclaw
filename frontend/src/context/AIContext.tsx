import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { fetchAiStatus, type AiStatus } from '../api'

interface AIState {
  status: AiStatus | null
  loading: boolean
  error: string | null
  retryCount: number
  refresh: () => Promise<void>
}

const AIContext = createContext<AIState>({
  status: null,
  loading: true,
  error: null,
  retryCount: 0,
  refresh: async () => {},
})

export function useAI() {
  return useContext(AIContext)
}

export function AIProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const s = await fetchAiStatus()
      setStatus(s)
      setError(null)
      setRetryCount(0)
    } catch (e: any) {
      const msg = e.message?.includes('Failed to fetch') ? 'Backend not reachable — is the CLI running on :3001?' : e.message
      setError(msg)
      setRetryCount((c) => c + 1)
      setStatus({ loaded: false, model: null, modelName: null, loadedAt: null, config: { ctx_size: 8192 }, isLoading: false, progress: null })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 3000)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <AIContext.Provider value={{ status, loading, error, retryCount, refresh }}>
      {children}
    </AIContext.Provider>
  )
}
