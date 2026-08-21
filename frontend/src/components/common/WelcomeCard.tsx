import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'

export default function WelcomeCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-glow relative overflow-hidden rounded-2xl p-6 mb-6"
    >
      {/* Colored accent glow - same as old WelcomeCard:42 */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'var(--color-accent-primary)' }} />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-xl font-bold text-gradient-white">
              Welcome to Everclaw
            </h2>
            <span className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--color-accent-primary)' }}>
              v0.5.5
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Your everyday on-device AI — with Kane CLI as your claw, ready to browse, click and act on
            the web for you. Choose a model below to get started.
          </p>
        </div>

        {/* Icon with blur glow circle - same style as old WelcomeCard:89-96 / StatCard */}
        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
          {/* Blur glow circle behind */}
          <div className="absolute inset-0 rounded-2xl blur-xl opacity-40" style={{ background: 'var(--color-accent-primary)' }} />
          {/* Solid circle */}
          <div className="absolute inset-0 rounded-2xl border border-white/10 shadow-sm" style={{ background: 'var(--color-bg-elevated)' }} />
          {/* Icon */}
          <Crown size={24} className="relative z-10 text-white" />
        </div>
      </div>

    </motion.div>
  )
}
