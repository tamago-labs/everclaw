import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Boxes, Bot, CheckCircle2, XCircle, LayoutDashboard, Copy, Check, Loader2 } from 'lucide-react'
import { fetchKaneStatus, fetchAiStatus, fetchSessions, fetchCronJobs } from '../api'

function formatUptime(loadedAt: number | null): string {
  if (!loadedAt) return '--'
  const diff = Math.floor((Date.now() - loadedAt) / 1000)
  const mins = Math.floor(diff / 60) % 60
  const hrs = Math.floor(diff / 3600) % 24
  const days = Math.floor(diff / 86400)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hrs > 0) parts.push(`${hrs}h`)
  if (mins > 0) parts.push(`${mins}m`)
  if (parts.length === 0) return '<1m'
  return parts.join(' ')
}

function GlassCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: 'rgba(26, 29, 46, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
        </div>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, isLast, valueNode }: { label: string; value?: string; isLast?: boolean; valueNode?: React.ReactNode }) {
  return (
    <div className={`flex justify-between py-2 ${isLast ? '' : 'border-b border-white/10'}`}>
      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      {valueNode ?? <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{value ?? '--'}</span>}
    </div>
  )
}

export default function OverviewPage() {
  const [kane, setKane] = useState<any>(null)
  const [ai, setAi] = useState<any>(null)
  const [sessionsCount, setSessionsCount] = useState('--')
  const [runningCronsCount, setRunningCronsCount] = useState('0')
  const [uptime, setUptime] = useState('--')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchKaneStatus().then(setKane).catch(() => setKane(null))
    fetchAiStatus().then(setAi).catch(() => setAi(null))
    fetchSessions().then((r) => setSessionsCount(String(r.sessions.length))).catch(() => setSessionsCount('0'))
    fetchCronJobs().then((r) => setRunningCronsCount(String(r.jobs.filter((j) => j.enabled).length))).catch(() => setRunningCronsCount('0'))
  }, [])

  useEffect(() => {
    const tick = () => setUptime(formatUptime(ai?.loadedAt ?? null))
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [ai?.loadedAt])

  const isReady = !!(ai?.loaded)
  const modelName = ai?.modelName || kane?.modelName || '--'

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <motion.h1 className="text-2xl font-bold text-gradient-white mb-1 flex items-center gap-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <LayoutDashboard size={22} style={{ color: 'var(--color-accent-primary)' }} />
          Overview
        </motion.h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Chat and automate the web — type <code style={{ color: 'var(--color-text-primary)' }}>/kane</code>, Kane does the work and reports back.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <GlassCard title="Kane CLI" icon={<Boxes size={18} style={{ color: 'var(--color-accent-primary)' }} />}>
            {!kane ? (
              <div className="text-sm flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}><Loader2 size={12} className="animate-spin" /> Checking…</div>
            ) : (
              <div className="space-y-0">
                <Row label="Installed" valueNode={
                  <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: kane.available ? '#00E68A' : '#F87171' }}>
                    {kane.available ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{kane.version || (kane.available ? 'yes' : 'no')}
                  </span>
                } />
                <Row label="Authenticated" valueNode={
                  <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: kane.authenticated ? '#00E68A' : 'var(--color-text-muted)' }}>
                    {kane.authenticated ? <CheckCircle2 size={14} style={{ color: '#00E68A' }} /> : <XCircle size={14} style={{ color: '#F87171' }} />}{kane.authenticated ? 'yes' : 'no'}
                  </span>
                } />
                <Row label="Balance" value={kane.balance ? `${kane.balance.available.toLocaleString()} / ${kane.balance.total.toLocaleString()}` : '--'} isLast />
              </div>
            )}
          </GlassCard>

          <GlassCard title="Local AI" icon={<Bot size={18} style={{ color: 'var(--color-accent-primary)' }} />}>
            <div className="space-y-0">
              <Row label="Status" valueNode={
                <span className="text-sm font-medium flex items-center gap-2" style={{ color: isReady ? '#00E68A' : 'var(--color-text-muted)' }}>
                  {!isReady && ai?.isLoading ? <><Loader2 size={12} className="animate-spin" />Loading...</> : isReady ? 'Ready' : 'Idle'}
                </span>
              } />
              <Row label="Model" value={modelName} />
              <Row label="Uptime" value={uptime} />
              <Row label="Sessions / Running Jobs" value={`${sessionsCount} / ${runningCronsCount}`} isLast />
            </div>
          </GlassCard>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: 'rgba(26, 29, 46, 0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="relative z-10">
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Prompt Cookbook</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>Chat and automate — copy a <code style={{ color: 'var(--color-text-primary)' }}>/kane</code> line and see the result in chat.</p>
            <div className="space-y-3 text-xs font-mono">
              {[
                { label: 'Search + store', url: 'https://www.ebay.com', code: `/kane search for 'headphones', store the first result title as 'first_title'` },
                { label: 'Check BTC price', url: 'https://www.investing.com/crypto', code: `/kane store the BTC price as 'btc_price'` },
                { label: 'Bsky — sign in', url: 'https://bsky.app', code: `/kane sign in with username {{username}} and password {{password}}, save the login result as 'login_result'` },
                { label: 'Bsky — post gm', url: 'https://bsky.app', code: `/kane click New Post, type 'gm, friend from kane', click the Post button, save the post url as 'post_url'` },
                { label: 'Health check', url: 'http://localhost:3001', code: `/kane assert no console errors and no API calls returned 5xx` },
                { label: 'Amazon — product', url: 'https://www.amazon.com/dp/B08N5WRWNW', code: `/kane assert the price is visible, store the product title as 'product_title'` },
                { label: 'Thailand — living guide', url: 'https://www.thailandstarterkit.com/moving/living-in-phra-khanong/', code: `/kane navigate to https://www.thailandstarterkit.com/moving/living-in-phra-khanong/, assert the page loads successfully, store the first paragraph text as 'first_paragraph'` },
                { label: 'OpenWeather — api_key', url: 'https://api.openweathermap.org', code: `/kane Call GET https://api.openweathermap.org/data/2.5/weather?q=Bangkok&appid={{api_key}}, save the response as weather, assert {{weather.status}} is 200` },
              ].map((ex) => (
                <div key={ex.label} className="rounded-xl p-3 flex items-start justify-between gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border-default)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold" style={{ color: 'var(--color-text-muted)' }}>{ex.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono truncate" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>{ex.url}</span>
                    </div>
                    <div className="whitespace-pre-wrap break-words" style={{ color: 'var(--color-text-primary)' }}>{ex.code}</div>
                  </div>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(ex.code)
                      setCopied(ex.label)
                      setTimeout(() => setCopied(null), 1500)
                    }}
                    className="shrink-0 p-1.5 rounded-lg"
                    style={{ background: copied === ex.label ? 'rgba(0,230,138,0.15)' : 'rgba(255,255,255,0.06)', color: copied === ex.label ? '#00E68A' : 'var(--color-text-muted)' }}
                    title="Copy prompt (URL is separate — paste in Kane modal)"
                  >
                    {copied === ex.label ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
