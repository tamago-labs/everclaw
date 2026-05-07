import { useTheme } from '../../context/ThemeContext';
import SeedPhraseWarning from './SeedPhraseWarning';

interface ImportWalletStepProps {
  importPhrase: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  canContinue: boolean;
}

export default function ImportWalletStep({ importPhrase, onChange, onContinue, canContinue }: ImportWalletStepProps) {
  const { isDark } = useTheme();
  const wordCount = importPhrase.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Import Your Wallet</h2>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Enter your 12 or 24 word recovery phrase</p>
      </div>

      <SeedPhraseWarning
        title="Your seed phrase stays local"
        description="Your recovery phrase is encrypted and stored only on this device."
      />

      {/* Import input */}
      <div className="mb-6">
        <textarea
          value={importPhrase}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your seed phrase (12 or 24 words)"
          className={`w-full h-40 rounded-xl p-4 resize-none focus:outline-none focus:border-accent-primary/50 ${
            isDark
              ? 'bg-[var(--color-bg-card)] border-white/10 text-white placeholder-gray-500'
              : 'bg-white border-black/10 text-gray-900 placeholder-gray-400'
          }`}
        />
        <p className={`text-sm mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {wordCount > 0 ? `${wordCount} words` : 'Enter words separated by spaces'}
        </p>
      </div>

      <button
        onClick={onContinue}
        disabled={!canContinue}
        className="w-full px-6 py-3 bg-accent-primary text-[#0F1117] rounded-xl font-semibold hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}