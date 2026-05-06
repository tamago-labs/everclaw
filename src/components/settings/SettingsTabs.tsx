import { useTheme } from '../../context/ThemeContext';

type Tab = 'about' | 'wallet';

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
        {/* Colored accent glow */}
        <div className={`absolute -top-12 -left-12 w-32 h-32 rounded-full bg-accent-primary blur-3xl ${isDark ? 'opacity-20' : 'opacity-15'}`} />
        
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
            onClick={() => onTabChange('about')}
            className={`relative px-5 py-2.5 font-medium text-sm transition-all ${
              activeTab === 'about'
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
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
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
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