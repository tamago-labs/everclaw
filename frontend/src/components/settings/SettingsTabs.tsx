type Tab = 'ai' | 'kane' | 'logs'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function SettingsTabs({ activeTab, onTabChange }: Props) {
  return (
    <div className="mb-6">
      <div
        className="glass relative overflow-hidden rounded-2xl p-1.5 flex"
        style={{ borderColor: 'rgba(255,255,255,0.10)' }}
      >
        <div className="relative z-10 flex gap-1">
          <button
            onClick={() => onTabChange('ai')}
            className="relative px-5 py-2.5 font-medium text-sm transition-all"
            style={{ color: activeTab === 'ai' ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
          >
            AI
            {activeTab === 'ai' && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--color-accent-primary)' }} />}
          </button>
          <button
            onClick={() => onTabChange('kane')}
            className="relative px-5 py-2.5 font-medium text-sm transition-all"
            style={{ color: activeTab === 'kane' ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
          >
            Kane
            {activeTab === 'kane' && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--color-accent-primary)' }} />}
          </button>
          <button
            onClick={() => onTabChange('logs')}
            className="relative px-5 py-2.5 font-medium text-sm transition-all"
            style={{ color: activeTab === 'logs' ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
          >
            Logs
            {activeTab === 'logs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--color-accent-primary)' }} />}
          </button>
        </div>
      </div>
    </div>
  )
}
