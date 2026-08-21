import { useNavigate, useLocation } from 'react-router-dom'
import { Crown, MessageSquare, LayoutDashboard, List, Settings, Bot } from 'lucide-react'

interface NavItem {
  icon: any
  label: string
  path: string
}

const navItems: { title: string; items: NavItem[] }[] = [
  {
    title: 'Chat',
    items: [{ icon: MessageSquare, label: 'Chat', path: '/' }],
  },
  {
    title: 'Control',
    items: [
      { icon: LayoutDashboard, label: 'Overview', path: '/overview' },
      { icon: List, label: 'Sessions', path: '/sessions' },
    ],
  },
  {
    title: 'Agent',
    items: [{ icon: Bot, label: 'Agents', path: '/agents' }],
  },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div
      className="w-[240px] shrink-0 flex flex-col border-r"
      style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border-subtle)' }}
    >
      {/* Brand */}
      <div className="px-6 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-accent-primary)', boxShadow: '0 0 20px rgba(0, 230, 138, 0.4)' }}
          >
            <Crown size={22} className="text-[#0F1117] -scale-x-100" />
          </div>
          <span className="text-lg font-black tracking-widest font-brand text-gradient-white">
            EVERCLAW
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
        {navItems.map((cat) => (
          <div key={cat.title}>
            <div
              className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.2em] font-brand text-gradient-white"
            >
              {cat.title}
            </div>
            <div className="space-y-1">
              {cat.items.map((item) => {
                const active = location.pathname === item.path || (item.path === '/' && location.pathname === '/chat')
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-[15px] font-semibold transition-all"
                    style={{
                      background: active ? 'var(--color-accent-primary-dim)' : 'transparent',
                      color: active ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    <item.icon
                      size={20}
                      strokeWidth={active ? 2.2 : 1.8}
                      style={{ color: active ? 'var(--color-accent-primary)' : 'var(--color-text-muted)' }}
                    />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="px-4 pb-5">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-[15px] font-semibold transition-all"
          style={{
            background: location.pathname === '/settings' ? 'var(--color-accent-primary-dim)' : 'transparent',
            color: location.pathname === '/settings' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
          }}
        >
          <Settings
            size={20}
            strokeWidth={location.pathname === '/settings' ? 2.2 : 1.8}
            style={{ color: location.pathname === '/settings' ? 'var(--color-accent-primary)' : 'var(--color-text-muted)' }}
          />
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}
