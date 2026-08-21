import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Boxes, Bot, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { fetchKaneStatus } from '../api'

function StatusRow({ icon, label, value }: { icon: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
        {icon ? <CheckCircle2 size={14} style={{ color: '#00E68A' }} /> : <XCircle size={14} style={{ color: '#F87171' }} />}
        {label}
      </span>
      <span style={{ color: 'var(--color-text-muted)' }}>{value || (icon ? 'yes' : 'no')}</span>
    </div>
  )
}

export default function OverviewPage() {
  const [kane, setKane] = useState<any>(null)

  useEffect(() => {
    fetchKaneStatus().then(setKane).catch(() => setKane(null))
  }, [])

  const cardCls = 'rounded-2xl p-5'
  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="rounded-2xl p-6 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: 'linear-gradient(135deg, rgba(0,230,138,0.10), rgba(255,255,255,0.02))', border: '1px solid var(--color-border-subtle)' }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gradient-white">Welcome to EVERCLAW</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Your local AI, with Kane CLI ready to act on the web when you need it.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{
                background: kane && kane.modelLoaded ? 'rgba(0,230,138,0.12)' : 'rgba(255,255,255,0.06)',
                color: kane && kane.modelLoaded ? '#00E68A' : 'var(--color-text-muted)',
              }}>
                {kane && kane.modelLoaded ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                AI {kane && kane.modelLoaded ? 'ready' : 'loading'}
              </span>
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{
                background: kane && kane.available ? 'rgba(0,230,138,0.12)' : 'rgba(255,255,255,0.06)',
                color: kane && kane.available ? '#00E68A' : 'var(--color-text-muted)',
              }}>
                {kane && kane.available ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                Kane {kane && kane.available ? 'ready' : 'checking'}
              </span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={cardCls} style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Boxes size={18} style={{ color: 'var(--color-accent-primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Kane CLI</span>
            </div>
            {!kane ? (
              <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Checking…</div>
            ) : (
              <div className="space-y-2 text-sm">
                <StatusRow icon={kane.available} label="Installed" value={kane.version || 'unknown'} />
                <StatusRow icon={kane.authenticated} label="Authenticated" value="" />
                {kane.balance && (
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-text-secondary)' }}>Balance</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{kane.balance.available.toLocaleString()} / {kane.balance.total.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={cardCls} style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Bot size={18} style={{ color: 'var(--color-accent-primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Local AI</span>
            </div>
            <div className="space-y-2.5 text-sm">
              <StatusRow icon={!!(kane && kane.modelLoaded)} label="Status" value={kane && kane.modelLoaded ? 'Ready' : 'Idle'} />
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--color-text-secondary)' }}>Model</span>
                <span className="font-mono truncate max-w-[140px]" style={{ color: 'var(--color-text-primary)' }}>{kane?.modelName || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={cardCls} style={cardStyle}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>What you can do</h2>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <li>• <span style={{ color: 'var(--color-text-primary)' }}>Chat</span> — talk to your local AI model directly.</li>
            <li>• <span style={{ color: 'var(--color-text-primary)' }}>Sessions</span> — keep separate, organized conversations.</li>
            <li>• <span style={{ color: 'var(--color-text-primary)' }}>Kane CLI</span> — your browser-automation agent; its status is shown above.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
