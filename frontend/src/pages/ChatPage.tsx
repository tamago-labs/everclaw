import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatContainer from '../components/chat/ChatContainer'
import { useAI } from '../context/AIContext'

export default function ChatPage() {
  const { status } = useAI()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')

  if (!status?.loaded) {
    return (
      <div className="p-8 flex items-center justify-center" style={{ height: 'calc(100vh - 48px)' }}>
        <div className="glass rounded-2xl h-96 w-full max-w-2xl flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--color-accent-primary)', borderTopColor: 'transparent' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Preparing AI...</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>(2-3 min, longer on first run)</p>
          </div>
        </div>
      </div>
    )
  }

  return <ChatContainer sessionId={sessionId} />
}
