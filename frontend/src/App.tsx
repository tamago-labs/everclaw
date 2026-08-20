import { AIProvider, useAI } from './context/AIContext'
import ModelSelectPage from './pages/ModelSelectPage'
import PlaceholderPage from './pages/PlaceholderPage'

function AppContent() {
  const { status, loading } = useAI()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40 text-sm">Connecting to CLI...</div>
      </div>
    )
  }

  if (!status?.loaded) {
    return <ModelSelectPage />
  }

  return <PlaceholderPage />
}

export default function App() {
  return (
    <AIProvider>
      <AppContent />
    </AIProvider>
  )
}
