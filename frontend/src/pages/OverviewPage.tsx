import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Boxes, Bot, CheckCircle2, XCircle, Clock, LayoutDashboard, Copy, Check } from 'lucide-react'
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
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchKaneStatus().then(setKane).catch(() => setKane(null))
  }, [])

  const cardCls = 'rounded-2xl p-5'
  const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border-subtle)' }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <motion.h1 className="text-2xl font-bold text-gradient-white mb-1 flex items-center gap-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <LayoutDashboard size={22} style={{ color: 'var(--color-accent-primary)' }} />
          Overview
        </motion.h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Local chat meets web automation — Everclaw hands /kane tasks to Kane and brings the result back.
        </p>

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
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Prompt Cookbook</h2>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>Local chat meets web automation — copy a /kane line, Everclaw hands it to Kane and brings the result back to chat.</p>
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
  )
}
