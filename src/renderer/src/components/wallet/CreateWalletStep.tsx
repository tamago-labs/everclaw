import { Copy, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import SeedPhraseWarning from './SeedPhraseWarning';

interface CreateWalletStepProps {
  seedPhrase: string;
  copied: boolean;
  onCopy: () => void;
  onContinue: () => void;
}

export default function CreateWalletStep({ seedPhrase, copied, onCopy, onContinue }: CreateWalletStepProps) {
  const { isDark } = useTheme();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Recovery Phrase</h2>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Write down these 24 words and store them safely.</p>
      </div>

      <SeedPhraseWarning
        title="Never share your seed phrase"
        description="Anyone with this phrase can access your funds. We will never ask for it."
      />

      {/* Seed phrase display */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 mb-6 ${
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

        <div className="grid grid-cols-3 gap-3 relative z-10">
          {seedPhrase.split(' ').map((word, index) => (
            <div key={index} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
              isDark ? 'bg-white/5' : 'bg-black/5'
            }`}>
              <span className={`text-xs w-6 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{index + 1}.</span>
              <span className={`font-mono text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{word}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Copy button */}
      <button
        onClick={onCopy}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors mb-6 ${
          isDark
            ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
            : 'bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900'
        }`}
      >
        {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
        {copied ? 'Copied!' : 'Copy to clipboard'}
      </button>

      <button
        onClick={onContinue}
        className="w-full px-6 py-3 bg-accent-primary text-[#0F1117] rounded-xl font-semibold hover:bg-accent-primary/90 transition-colors"
      >
        I've written it down, continue
      </button>
    </div>
  );
}