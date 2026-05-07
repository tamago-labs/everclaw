import { useTheme } from '../../context/ThemeContext';
import { Sparkles, Upload } from 'lucide-react';

interface WalletChoiceStepProps {
  onCreate: () => void;
  onImport: () => void;
}

export default function WalletChoiceStep({ onCreate, onImport }: WalletChoiceStepProps) {
  const { isDark } = useTheme();

  return (
    <div className="max-w-2xl mx-auto">
      <p className={`text-center mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Choose how you want to get started</p>

      <div className="space-y-4">
        {/* Create New Wallet */}
        <button
          onClick={onCreate}
          className={`w-full relative overflow-hidden rounded-2xl p-5 text-left transition-all hover:scale-[1.02] ${
            isDark
              ? 'border border-white/10'
              : 'border border-black/5 shadow-md'
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

          <div className="flex items-center gap-4 relative z-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-white/5' : 'bg-black/5'
            }`}>
              <Sparkles size={20} className="text-accent-primary" />
            </div>
            <div>
              <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Create New Wallet
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Generate a new secure wallet with a fresh seed phrase
              </p>
            </div>
          </div>
        </button>

        {/* Import Existing Wallet */}
        <button
          onClick={onImport}
          className={`w-full relative overflow-hidden rounded-2xl p-5 text-left transition-all hover:scale-[1.02] ${
            isDark
              ? 'border border-white/10'
              : 'border border-black/5 shadow-md'
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

          <div className="flex items-center gap-4 relative z-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-white/5' : 'bg-black/5'
            }`}>
              <Upload size={20} className="text-accent-primary" />
            </div>
            <div>
              <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Import Existing Wallet
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Restore your wallet using an existing seed phrase
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}