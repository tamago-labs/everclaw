import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { fetchAiStatus, type AiStatus } from '../api'

interface AIState {
  status: AiStatus | null
  loading: boolean
  refresh: () => Promise<void>
}

const AIContext = createContext<AIState>({
  status: null,
  loading: true,
  refresh: async () => {},
})

export function useAI() {
  return useContext(AIContext)
}

export function AIProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const s = await fetchAiStatus()
      setStatus(s)
    } catch {
      setStatus({ loaded: false, model: null, modelName: null, loadedAt: null, config: { ctx_size: 8192, tools: false }, isLoading: false, progress: null })
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
    <AIContext.Provider value={{ status, loading, refresh }}>
      {children}
    </AIContext.Provider>
  )
}
