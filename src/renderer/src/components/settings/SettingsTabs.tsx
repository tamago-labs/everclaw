import { useTheme } from '../../context/ThemeContext';

type Tab = 'logs' | 'about' | 'wallet';

interface SettingsTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  const { isDark } = useTheme();

  return (
    <div className="mb-6">
      <div 
        className={`relative overflow-hidden rounded-2xl p-1.5 flex border ${
          isDark ? 'border-white/10' : 'border-black/5'
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
        <div className={`absolute inset-0 rounded-2xl ${
          isDark 
            ? 'bg-gradient-to-br from-white/5 to-transparent' 
            : 'bg-gradient-to-br from-white/80 to-transparent'
        }`} />
        
        {/* Top highlight */}
        <div className={`absolute top-0 left-0 w-full h-px ${
          isDark 
            ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' 
            : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
        }`} />

        <div className="relative z-10 flex gap-1">
          <button
            onClick={() => onTabChange('logs')}
            className={`relative px-5 py-2.5 font-medium text-sm transition-all ${
              activeTab === 'logs'
                ? isDark ? 'text-white' : 'text-gray-900'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Logs
            {activeTab === 'logs' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => onTabChange('about')}
            className={`relative px-5 py-2.5 font-medium text-sm transition-all ${
              activeTab === 'about'
                ? isDark ? 'text-white' : 'text-gray-900'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            About
            {activeTab === 'about' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => onTabChange('wallet')}
            className={`relative px-5 py-2.5 font-medium text-sm transition-all ${
              activeTab === 'wallet'
                ? isDark ? 'text-white' : 'text-gray-900'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Wallet
            {activeTab === 'wallet' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary rounded-full" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}