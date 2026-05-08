import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import GlassDropdown from '../common/GlassDropdown';
import GlassButton from '../common/GlassButton';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';

type Tab = 'balances' | 'transactions';

// Token image URLs for native tokens
const TOKEN_IMAGES: Record<string, string> = {
  ETH: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  POL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28321.png',
  SOL: 'https://icons.llamao.fi/icons/chains/rsz_solana?w=48&h=48',
  BTC: 'https://assets.coingecko.com/coins/images/1/standard/bitcoin.png?1696501400'
};

const chainLabels: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  solana: 'Solana',
  bitcoin: 'Bitcoin',
};

interface TokenBalance {
  symbol: string;
  contractAddress: string;
  chain: string;
  decimals: number;
  isDefault: boolean;
  balance: string;
  balanceFormatted: string;
  value: string;
  price: number;
  imageUrl: string;
}

interface BalanceResult {
  chain: string;
  nativeBalance: string;
  nativeBalanceFormatted: string;
  nativeValue: string;
  tokens: TokenBalance[];
}

interface AllBalances {
  ethereum?: BalanceResult;
  polygon?: BalanceResult;
  arbitrum?: BalanceResult;
  solana?: BalanceResult;
  bitcoin?: BalanceResult;
}

export default function TokenBalancesSection() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { hasWallet } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('balances');
  const [selectedChain, setSelectedChain] = useState<string>('solana');
  const [balances, setBalances] = useState<AllBalances>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (hasWallet) {
      fetchBalances();
    }
  }, [hasWallet]);

  const fetchBalances = async () => {
    try {
      setIsLoading(true);
      const result = await (window as any).everclawAPI.balances.getAll();
      
      const balancesMap: AllBalances = {};
      for (const item of result) {
        balancesMap[item.chain] = item;
      }
      setBalances(balancesMap);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateSettings = () => {
    navigate('/settings');
  };

  // Get available chains from balances
  const availableChains = Object.keys(balances).length > 0 
    ? Object.keys(balances) 
    : ['ethereum', 'polygon', 'arbitrum', 'solana', 'bitcoin'];

  const chainOptions = availableChains.map(chain => ({
    value: chain,
    label: chainLabels[chain] || chain,
  }));

  // Get tokens for selected chain
  const selectedBalance = balances[selectedChain];
  const chainTokens: TokenBalance[] = [];

  if (selectedBalance) {
    // Add native token
    const nativeSymbols: Record<string, string> = {
      ethereum: 'ETH',
      polygon: 'POL',
      arbitrum: 'ETH',
      solana: 'SOL',
      bitcoin: 'BTC',
    };
    const nativeSymbol = nativeSymbols[selectedChain] || selectedChain.toUpperCase();
    chainTokens.push({
      symbol: nativeSymbol,
      contractAddress: 'native',
      chain: selectedChain,
      decimals: selectedChain === 'solana' ? 9 : selectedChain === 'bitcoin' ? 8 : 18,
      isDefault: true,
      balance: selectedBalance.nativeBalance || '0',
      balanceFormatted: selectedBalance.nativeBalanceFormatted || '0',
      value: selectedBalance.nativeValue || '$0',
      price: 0,
      imageUrl: '', // Native tokens will use their symbol's image
    });
    
    // Add other tokens
    if (selectedBalance.tokens) {
      for (const token of selectedBalance.tokens) {
        chainTokens.push(token);
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-8"
    >
      {/* Tabs - Separate Glass Card */}
      <div 
        className={`relative overflow-hidden rounded-2xl p-1.5 flex border mb-4 ${
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
        <div className={`absolute inset-0 rounded-2xl ${
          isDark 
            ? 'bg-gradient-to-br from-white/5 to-transparent' 
            : 'bg-gradient-to-br from-white/80 to-transparent'
        }`} />
        <div className={`absolute top-0 left-0 w-full h-px ${
          isDark 
            ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' 
            : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
        }`} />

        <div className="relative z-10 flex gap-1">
          <button
            onClick={() => setActiveTab('balances')}
            className={`relative px-5 py-2.5 font-medium text-sm transition-all ${
              activeTab === 'balances'
                ? isDark ? 'text-white' : 'text-gray-900'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Token Balances
            {activeTab === 'balances' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`relative px-5 py-2.5 font-medium text-sm transition-all ${
              activeTab === 'transactions'
                ? isDark ? 'text-white' : 'text-gray-900'
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Transactions
            {activeTab === 'transactions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Content - Separate Glass Card */}
      <div 
        className={`relative overflow-hidden rounded-2xl p-6 border ${
          isDark 
            ? 'border-white/10' 
            : 'border-black/5 shadow-lg'
        }`}
        style={{
          background: isDark 
            ? 'rgba(26, 29, 46, 0.6)' 
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className={`absolute inset-0 rounded-2xl ${
          isDark 
            ? 'bg-gradient-to-br from-white/5 to-transparent' 
            : 'bg-gradient-to-br from-white/80 to-transparent'
        }`} />
        <div className={`absolute top-0 left-0 w-full h-px ${
          isDark 
            ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent' 
            : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
        }`} />

        <div className="relative z-10">
          {activeTab === 'balances' ? (
            <div className="space-y-4">
              {/* Chain Filter + Refresh */}
              <div className="flex items-center justify-between mb-4">
                <GlassDropdown
                  label="Chain"
                  value={selectedChain}
                  options={chainOptions}
                  onChange={setSelectedChain}
                />
                <GlassButton 
                  icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />} 
                  title="Refresh balances" 
                  onClick={fetchBalances}
                />
              </div>

              {/* Balances Table */}
              <div className={`rounded-xl overflow-hidden border ${
                isDark ? 'border-white/5' : 'border-black/5'
              }`}>
                <div className={`grid grid-cols-[1fr_1fr_1fr] gap-4 px-6 py-3 border-b ${
                  isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-gray-50'
                }`}>
                  <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase">Token</span>
                  <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase">Balance</span>
                  <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase">Value</span>
                </div>

                {!hasWallet ? (
                  <div className={`rounded-b-xl p-8 text-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      No wallet configured
                    </p>
                  </div>
                ) : isLoading ? (
                  <div className={`px-6 py-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Loading balances...
                  </div>
                ) : chainTokens.length === 0 ? (
                  <div className={`px-6 py-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    No tokens found for {chainLabels[selectedChain] || selectedChain}
                  </div>
                ) : (
                  chainTokens.map((token, index) => (
                    <div
                      key={`${token.chain}-${token.symbol}-${index}`}
                      className={`grid grid-cols-[1fr_1fr_1fr] gap-4 px-6 py-4 border-b items-center ${
                        isDark ? 'border-white/5' : 'border-black/5'
                      } ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        {(token.imageUrl || TOKEN_IMAGES[token.symbol]) && (
                          <img 
                            src={token.imageUrl || TOKEN_IMAGES[token.symbol]} 
                            alt={token.symbol} 
                            className="w-5 h-5 rounded-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{token.symbol}</span>
                      </div>
                      <span className="text-sm text-[var(--color-text-muted)]">{token.balanceFormatted}</span>
                      <span className="text-sm text-[var(--color-text-primary)]">{token.value}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Navigate to settings */}
              <button
                onClick={handleNavigateSettings}
                className="text-sm text-green-500 hover:text-green-400 transition-colors"
              >
                Add more tokens for agent operations →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chain Filter + Refresh */}
              <div className="flex items-center justify-between mb-4">
                <GlassDropdown
                  label="Chain"
                  value={selectedChain}
                  options={chainOptions}
                  onChange={setSelectedChain}
                />
                <GlassButton 
                  icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />} 
                  title="Refresh" 
                  onClick={fetchBalances}
                />
              </div>

              {/* Transactions placeholder */}
              <div className={`rounded-xl p-8 text-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Transactions history coming soon
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}