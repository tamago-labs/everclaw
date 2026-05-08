import { useState, useEffect } from 'react';
import { Plus, X, Info } from 'lucide-react';
import GlassDropdown from '../common/GlassDropdown';
import { useTheme } from '../../context/ThemeContext';

interface Token {
  symbol: string;
  contractAddress: string;
  chain: string;
  decimals: number;
  isDefault: boolean;
}

type ChainId = 'solana' | 'ethereum' | 'polygon' | 'arbitrum' | 'bitcoin';

const chains: ChainId[] = ['solana', 'ethereum', 'polygon', 'arbitrum', 'bitcoin'];
const chainLabels: Record<ChainId, string> = {
  solana: 'Solana',
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  bitcoin: 'Bitcoin',
};

const noCustomTokensChains: ChainId[] = ['bitcoin'];

export default function TokensTab() {
  const { isDark } = useTheme();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [activeChain, setActiveChain] = useState<ChainId>('solana');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newContract, setNewContract] = useState('');
  const [newDecimals, setNewDecimals] = useState('18');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setIsLoading(true);
      const allTokens = await (window as any).everclawAPI.tokens.list();
      setTokens(allTokens);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTokens = tokens.filter(t => t.chain === activeChain);
  const supportsCustomTokens = !noCustomTokensChains.includes(activeChain);

  const handleRemoveCustom = async (symbol: string) => {
    try {
      await (window as any).everclawAPI.tokens.remove(activeChain, symbol);
      setTokens(tokens.filter(t => !(t.chain === activeChain && t.symbol === symbol)));
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  };

  const handleAddToken = async () => {
    if (newSymbol && newContract) {
      try {
        const token = {
          symbol: newSymbol.toUpperCase(),
          contractAddress: newContract,
          decimals: parseInt(newDecimals) || 18,
        };
        await (window as any).everclawAPI.tokens.add(activeChain, token);
        setTokens([...tokens, { ...token, chain: activeChain, isDefault: false }]);
        setNewSymbol('');
        setNewContract('');
        setNewDecimals('18');
        setShowAddModal(false);
      } catch (error) {
        console.error('Failed to add token:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Token Registry
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Manage custom tokens used by your agents
          </p>
        </div>
      </div>

      {/* Chain Filter */}
      <div>
        <GlassDropdown
          label="Chain"
          value={activeChain}
          options={chains.map(chain => ({ value: chain, label: chainLabels[chain] }))}
          onChange={(value) => setActiveChain(value as ChainId)}
        />
      </div>

      {/* Bitcoin notice */}
      {!supportsCustomTokens && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
          isDark ? 'bg-white/5' : 'bg-gray-100'
        }`}>
          <Info size={18} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Custom tokens are not supported for Bitcoin
          </p>
        </div>
      )}

      {/* Token Table */}
      <div className="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] overflow-hidden">
        {/* Table Header */}
        <div className={`grid grid-cols-[1fr_auto_2fr_1fr_auto] gap-4 px-6 py-3 border-b ${
          isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-gray-50'
        }`}>
          <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase">Symbol</span>
          <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase w-12 text-center">Default</span>
          <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase">Contract Address</span>
          <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase">Decimals</span>
          <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase w-16 text-right">Action</span>
        </div>

        {/* Token Rows */}
        {isLoading ? (
          <div className={`px-6 py-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Loading...
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className={`px-6 py-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            No tokens for {chainLabels[activeChain]}
          </div>
        ) : (
          filteredTokens.map((token) => (
            <div
              key={`${token.chain}-${token.symbol}`}
              className={`grid grid-cols-[1fr_auto_2fr_1fr_auto] gap-4 px-6 py-4 border-b ${
                isDark ? 'border-white/5' : 'border-black/5'
              } ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
            >
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{token.symbol}</span>
              <div className="flex justify-center">
                {token.isDefault ? (
                  <span className="text-green-500">✓</span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </div>
              <span className="text-sm font-mono text-[var(--color-text-muted)] truncate">
                {token.contractAddress}
              </span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {token.decimals}
              </span>
              <div className="flex justify-end">
                {!token.isDefault && (
                  <button
                    onClick={() => handleRemoveCustom(token.symbol)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Button - hidden for Bitcoin */}
      {supportsCustomTokens && (
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-accent-primary/90 text-[#0F1117] font-semibold rounded-xl transition-colors"
        >
          <Plus size={16} />
          Add Custom Token
        </button>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className={`relative w-full max-w-md mx-4 rounded-2xl p-6 ${
              isDark ? 'bg-[#1a1d2e] border border-white/10' : 'bg-white border border-black/5 shadow-xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Add Custom Token</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1.5">Symbol</label>
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="e.g. LINK"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500'
                      : 'bg-gray-50 border-black/5 text-gray-900 placeholder:text-gray-400'
                  } focus:outline-none focus:border-accent-primary`}
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1.5">Contract Address</label>
                <input
                  type="text"
                  value={newContract}
                  onChange={(e) => setNewContract(e.target.value)}
                  placeholder={activeChain === 'solana' ? 'token address...' : '0x...'}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500'
                      : 'bg-gray-50 border-black/5 text-gray-900 placeholder:text-gray-400'
                  } focus:outline-none focus:border-accent-primary font-mono`}
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1.5">Decimals</label>
                <input
                  type="number"
                  value={newDecimals}
                  onChange={(e) => setNewDecimals(e.target.value)}
                  placeholder="18"
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-500'
                      : 'bg-gray-50 border-black/5 text-gray-900 placeholder:text-gray-400'
                  } focus:outline-none focus:border-accent-primary`}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className={`flex-1 px-4 py-2.5 rounded-xl border transition-colors ${
                  isDark
                    ? 'border-white/10 text-gray-400 hover:bg-white/5'
                    : 'border-black/5 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddToken}
                disabled={!newSymbol || !newContract}
                className="flex-1 px-4 py-2.5 bg-accent-primary text-[#0F1117] font-semibold rounded-xl hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
              >
                Add Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}