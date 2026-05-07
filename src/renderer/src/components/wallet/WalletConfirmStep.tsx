import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface WalletConfirmStepProps {
  action: 'create' | 'import';
  isLoading: boolean;
  onConfirm: () => void;
}

const chainImages = {
  Ethereum: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  Polygon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28321.png',
  Arbitrum: 'https://assets.coingecko.com/coins/images/16547/standard/arb.jpg?1721358242',
  Solana: 'https://icons.llamao.fi/icons/chains/rsz_solana?w=48&h=48',
  Bitcoin: 'https://assets.coingecko.com/coins/images/1/standard/bitcoin.png?1696501400',
};

const chains = ['Ethereum', 'Polygon', 'Arbitrum', 'Solana', 'Bitcoin'] as const;
const DEFAULT_CHAINS = ['Ethereum', 'Solana', 'Bitcoin'] as const;

export default function WalletConfirmStep({ action, isLoading, onConfirm }: WalletConfirmStepProps) {
  const { isDark } = useTheme();
  const [showAll, setShowAll] = useState(false);

  const visibleChains = showAll ? chains : DEFAULT_CHAINS;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Almost Done!</h2>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          {action === 'create' 
            ? 'Your wallet will be created with the seed phrase you just saved.' 
            : 'Your wallet will be restored using your seed phrase.'}
        </p>
      </div>

      {/* Summary card with glass effect */}
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

        {/* Chain list */}
        <div className="relative z-10 space-y-3">
          {visibleChains.map((chain) => (
            <div
              key={chain}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                isDark ? 'bg-white/5' : 'bg-gray-50'
              }`}
            >
              <img
                src={chainImages[chain]}
                alt={chain}
                className="w-8 h-8 rounded-full object-cover"
              />
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {chain}
              </p>
            </div>
          ))}
        </div>

        {/* Show all toggle */}
        <button
          onClick={() => setShowAll(!showAll)}
          className="relative z-10 mt-4 text-sm text-accent-primary hover:text-accent-primary/80 transition-colors"
        >
          {showAll ? 'Show less' : 'Show all'}
        </button>
      </div>

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className="w-full px-6 py-3 bg-accent-primary text-[#0F1117] rounded-xl font-semibold hover:bg-accent-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-[#0F1117] border-t-transparent rounded-full animate-spin" />
            Setting up...
          </>
        ) : (
          action === 'create' ? 'Create Wallet' : 'Restore Wallet'
        )}
      </button>
    </div>
  );
}