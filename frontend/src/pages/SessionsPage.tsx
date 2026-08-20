import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SessionsTable from '../components/sessions/SessionsTable'
import { fetchSessions, type Session } from '../api'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const loadSessions = async () => {
    setLoading(true)
    const r = await fetchSessions()
    setSessions(r.sessions)
    setLoading(false)
  }

  useEffect(() => { loadSessions() }, [])

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <motion.h1
          className="text-2xl font-bold text-gradient-white mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Sessions
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SessionsTable
            sessions={sessions}
            loading={loading}
            onRefresh={loadSessions}
          />
        </motion.div>
      </div>
    </div>
  )
}
