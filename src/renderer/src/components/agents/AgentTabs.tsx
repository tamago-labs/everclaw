import { useTheme } from '../../context/ThemeContext';

type Tab = 'overview' | 'files' | 'cron-jobs';

interface AgentTabsProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export default function AgentTabs({ activeTab, onTabChange }: AgentTabsProps) {
    const { isDark } = useTheme();

    const tabs: { id: Tab; label: string }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'files', label: 'Files' }, 
        { id: 'cron-jobs', label: 'Cron Jobs' }
    ];

    return (
        <div className="mb-6">
            <div
                className={`relative overflow-hidden rounded-2xl p-1.5 flex border ${isDark ? 'border-white/10' : 'border-black/5'
                    }`}
                style={{
                    background: isDark
                        ? 'rgba(26, 29, 46, 0.6)'
                        : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                {/* Glass shine effect */}
                <div className={`absolute inset-0 rounded-2xl ${isDark
                    ? 'bg-gradient-to-br from-white/5 to-transparent'
                    : 'bg-gradient-to-br from-white/80 to-transparent'
                    }`} />

                {/* Top highlight */}
                <div className={`absolute top-0 left-0 w-full h-px ${isDark
                    ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
                    : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
                    }`} />

                <div className="relative z-10 flex gap-1 flex-wrap">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`relative px-4 py-2 font-medium text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                                ? isDark ? 'text-white' : 'text-gray-900'
                                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}