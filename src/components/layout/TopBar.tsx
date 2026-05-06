import { useEffect } from 'react';
import { useLocation, Link } from 'react-router';
import { Search, Sun, Moon, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const routeMeta: Record<string, { category: string; label: string }> = {
  '/': { category: 'Control', label: 'Overview' },
  '/settings': { category: 'Everclaw', label: 'Settings' },
  '/chat': { category: 'Chat', label: 'Chat' },
  '/sessions': { category: 'Control', label: 'Sessions' },
  '/usage': { category: 'Control', label: 'Usage' },
  '/cron-jobs': { category: 'Control', label: 'Cron Jobs' },
  '/agents': { category: 'Agent', label: 'Agents' },
  '/skills': { category: 'Agent', label: 'Skills' },
};

export default function TopBar() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  // Listen for theme changes from menu (main process)
  useEffect(() => {
    const cleanup = window.everclawAPI?.onThemeChanged(() => {
      toggleTheme();
    });
    return cleanup;
  }, [toggleTheme]);

  // Build breadcrumb: Category > Page
  const meta = routeMeta[location.pathname] || { category: 'Everclaw', label: 'Overview' };
  const breadcrumbItems = [
    { label: meta.category, path: '/' },
    { label: meta.label, path: location.pathname },
  ];

  return (
    <div className="flex items-center h-12 px-5 bg-[var(--color-topbar-bg)] backdrop-blur-md border-b border-[var(--color-border-subtle)] shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        {breadcrumbItems.map((item, i) => (
          <span key={`${item.path}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-[var(--color-text-muted)]" />}
            <Link
              to={item.path}
              className={`font-medium ${i === breadcrumbItems.length - 1
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                } transition-colors`}
            >
              {item.label}
            </Link>
          </span>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] text-[var(--color-text-muted)] text-sm mr-3 hover:border-accent-primary/30 transition-colors">
        <Search size={14} />
        <span>Search...</span>
        <div className="flex items-center gap-1 ml-4">
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-default)]">
            Ctrl
          </kbd>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-default)]">
            K
          </kbd>
        </div>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-sidebar-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      > {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  );
}