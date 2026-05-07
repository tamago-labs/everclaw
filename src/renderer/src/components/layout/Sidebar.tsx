import { useLocation, useNavigate } from 'react-router';
import {
  MessageSquare,
  LayoutDashboard,
  MonitorSmartphone,
  Clock,
  Bot,
  Wrench,
  Settings,
  Crown
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface NavItem {
  icon: typeof MessageSquare;
  label: string;
  path: string;
}

interface NavCategory {
  title: string;
  items: NavItem[];
}

const categories: NavCategory[] = [
  {
    title: 'Chat',
    items: [
      { icon: MessageSquare, label: 'Chat', path: '/chat' },
    ],
  },
  {
    title: 'Control',
    items: [
      { icon: LayoutDashboard, label: 'Overview', path: '/' },
      { icon: MonitorSmartphone, label: 'Sessions', path: '/sessions' },
      // { icon: BarChart3, label: 'Usage', path: '/usage' },
      { icon: Clock, label: 'Cron Jobs', path: '/cron-jobs' },
    ],
  },
  {
    title: 'Agent',
    items: [
      { icon: Bot, label: 'Agents', path: '/agents' },
      { icon: Wrench, label: 'Tools', path: '/tools' },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const textGradientClass = isDark ? 'text-gradient-white' : 'text-gradient-light';

  return (
    <aside className="w-[240px] bg-[var(--color-bg-surface)] border-r border-[var(--color-border-subtle)] flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-6 pt-6 pb-8">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-accent-primary flex items-center justify-center shrink-0 shadow-[0_0_20px_var(--color-glow-green)]">
            <Crown size={24} className="text-[#0F1117] -scale-x-100" strokeWidth={2} />
          </div>
          <div>

            <div className={`text-lg font-black tracking-widest leading-tight font-brand ${textGradientClass}`}>
              EVERCLAW
            </div>
          </div>
        </div>
      </div>

      {/* Nav categories */}
      <nav className="flex-1 px-4 space-y-6 overflow-y-auto">
        {categories.map((category) => (
          <div key={category.title}>
            <div className="px-3 mb-2">
              <span className={`text-[11px] font-bold uppercase tracking-[0.2em] font-brand ${textGradientClass}`}>
                {category.title}
              </span>
            </div>
            <div className="space-y-1">
              {category.items.map(({ icon: Icon, label, path }) => {
                const active = location.pathname === path;
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={`flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-[15px] font-semibold transition-all ${active
                      ? 'bg-accent-primary-dim'
                      : 'hover:bg-[var(--color-sidebar-hover)]'
                      }`}
                  >
                    <Icon size={20} strokeWidth={active ? 2.2 : 1.8} className={active ? 'text-accent-primary' : ''} />
                    <span className={active ? 'text-accent-primary' : textGradientClass}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="px-4 pb-5">
        <button
          onClick={() => navigate('/settings')}
          className={`flex items-center gap-3.5 w-full px-3.5 py-2.5 rounded-xl text-[15px] font-semibold transition-all ${location.pathname === '/settings'
            ? 'bg-accent-primary-dim'
            : 'hover:bg-[var(--color-sidebar-hover)]'
            }`}
        >
          <Settings size={20} strokeWidth={location.pathname === '/settings' ? 2.2 : 1.8} className={location.pathname === '/settings' ? 'text-accent-primary' : ''} />
          <span className={location.pathname === '/settings' ? 'text-accent-primary' : textGradientClass}>Settings</span>
        </button>
      </div>
    </aside>
  );
}