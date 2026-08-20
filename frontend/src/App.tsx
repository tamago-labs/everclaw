import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AIProvider } from './context/AIContext'
import DashboardLayout from './components/layout/DashboardLayout'
import ChatPage from './pages/ChatPage'
import SessionsPage from './pages/SessionsPage'
import SettingsPage from './pages/SettingsPage'
import OverviewPage from './pages/OverviewPage'
import ModelSelectPage from './pages/ModelSelectPage'
import { useAI } from './context/AIContext'

function AppRoutes() {
  const { status, loading } = useAI()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg-base)' }}>
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Connecting to CLI...</div>
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
