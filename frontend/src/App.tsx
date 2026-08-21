import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AIProvider } from './context/AIContext'
import DashboardLayout from './components/layout/DashboardLayout'
import ChatPage from './pages/ChatPage'
import SessionsPage from './pages/SessionsPage'
import SettingsPage from './pages/SettingsPage'
import OverviewPage from './pages/OverviewPage'
import AgentsPage from './pages/AgentsPage'
import VariablesPage from './pages/VariablesPage'
import ModelSelectPage from './pages/ModelSelectPage'
import { useAI } from './context/AIContext'

function AppRoutes() {
  const { status, loading, error, retryCount } = useAI()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: 'var(--color-bg-base)' }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-accent-primary)', borderTopColor: 'transparent' }} />
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Connecting to CLI...{retryCount ? ` retry ${retryCount}` : ''}</div>
        {error && <div className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>{error}</div>}
      </div>
    )
  }

  if (!status?.loaded) {
    return <ModelSelectPage />
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<ChatPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/variables" element={<VariablesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/overview" element={<OverviewPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AIProvider>
        <AppRoutes />
      </AIProvider>
    </BrowserRouter>
  )
}
