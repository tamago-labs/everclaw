import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

interface WalletAddress {
  chain: 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Solana' | 'Bitcoin';
  address: string;
}

interface AccountCardProps {
  addresses: WalletAddress[];
  isPlaceholder?: boolean;
}

// Default placeholder addresses in order
const PLACEHOLDER_ADDRESSES: WalletAddress[] = [
  { chain: 'Ethereum', address: '...' },
  { chain: 'Polygon', address: '...' },
  { chain: 'Arbitrum', address: '...' },
  { chain: 'Solana', address: '...' },
  { chain: 'Bitcoin', address: '...' },
];

const chainImages = {
  Ethereum: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  Polygon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28321.png',
  Arbitrum: 'https://assets.coingecko.com/coins/images/16547/standard/arb.jpg?1721358242',
  Solana: 'https://icons.llamao.fi/icons/chains/rsz_solana?w=48&h=48',
  Bitcoin: 'https://assets.coingecko.com/coins/images/1/standard/bitcoin.png?1696501400',
};

const DEFAULT_CHAINS = ['Ethereum', 'Solana', 'Bitcoin'] as const;

export default function AccountCard({ addresses, isPlaceholder = false }: AccountCardProps) {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const displayAddresses = isPlaceholder ? PLACEHOLDER_ADDRESSES : addresses;
  
  // Filter addresses based on showAll state
  const visibleAddresses = showAll 
    ? displayAddresses 
    : displayAddresses.filter(addr => DEFAULT_CHAINS.includes(addr.chain as typeof DEFAULT_CHAINS[number]));

  const truncateAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const copyToClipboard = async (address: string, index: number) => {
    if (isPlaceholder) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopiedIndex(index);
      showToast('Address copied to clipboard!');
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`relative overflow-hidden rounded-2xl p-6 ${
        isDark 
          ? 'border border-white/10' 
          : 'border border-black/5 shadow-lg'
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

      <div className="relative z-10">
        {/* Header */}
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Account
        </h3>

        {/* Wallet addresses list */}
        <div className="space-y-3">
          {visibleAddresses.map((wallet, index) => (
            <div 
              key={wallet.chain}
              className={`flex items-center justify-between p-3 rounded-xl ${
                isDark ? 'bg-white/5' : 'bg-gray-50'
              } ${isPlaceholder ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                {/* Chain image icon */}
                <img 
                  src={chainImages[wallet.chain]} 
                  alt={wallet.chain}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {wallet.chain}
                  </p>
                  <p className={`text-sm font-mono ${isDark ? 'text-white' : 'text-gray-800'} ${
                    isPlaceholder ? 'text-gray-500 italic' : ''
                  }`}>
                    {isPlaceholder ? wallet.address : truncateAddress(wallet.address)}
                  </p>
                </div>
              </div>

              {/* Copy button */}
              <button
                onClick={() => copyToClipboard(wallet.address, index)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isPlaceholder 
                    ? 'cursor-not-allowed opacity-50' 
                    : isDark 
                      ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
                } ${copiedIndex === index ? 'text-green-500' : ''}`}
                disabled={isPlaceholder}
              >
                <AnimatePresence mode="wait">
                  {copiedIndex === index ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check size={18} />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Copy size={18} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          ))}
        </div>

        {/* Show all toggle */}
        {!isPlaceholder && displayAddresses.length > DEFAULT_CHAINS.length && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-4 text-sm text-accent-primary hover:text-accent-primary/80 transition-colors"
          >
            {showAll ? 'Show less' : 'Show all'}
          </button>
        )}
      </div>
    </motion.div>
  );
}