import { useState, useEffect } from 'react';
import { X, ArrowDownUp, Loader2, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface TokenConfig {
  symbol: string;
  contractAddress: string;
  chain: string;
  decimals: number;
  isDefault: boolean;
  imageUrl: string;
}

// Token image URLs for supported tokens
const TOKEN_IMAGES: Record<string, string> = {
  ETH: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  WETH: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png',
  POL: 'https://s2.coinmarketcap.com/static/img/coins/64x64/28321.png',
  SOL: 'https://icons.llamao.fi/icons/chains/rsz_solana?w=48&h=48',
  BTC: 'https://assets.coingecko.com/coins/images/1/standard/bitcoin.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/standard/USDC.png',
  USDS: 'https://assets.coingecko.com/coins/images/39926/standard/usds.webp',
  LINK: 'https://assets.coingecko.com/coins/images/877/standard/Chainlink_Logo_500.png',
  USDE: 'https://assets.coingecko.com/coins/images/33613/standard/usde.png',
  PENGU: 'https://assets.coingecko.com/coins/images/52622/standard/PUDGY_PENGUINS_PENGU_PFP.png',
  PEPE: 'https://assets.coingecko.com/coins/images/29850/standard/pepe-token.jpeg',
  SIREN: 'https://assets.coingecko.com/coins/images/54479/standard/siren.png',
  PUMP: 'https://assets.coingecko.com/coins/images/67164/standard/pump.jpg',
  BONK: 'https://assets.coingecko.com/coins/images/28600/standard/bonk.jpg',
  TRUMP: 'https://assets.coingecko.com/coins/images/53746/standard/trump.png',
};

interface JupiterSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputToken: {
    symbol: string;
    mint: string;
    balance: string;
  } | null;
}

export default function JupiterSwapModal({ isOpen, onClose, inputToken }: JupiterSwapModalProps) {
  const { isDark } = useTheme();
  const [tokens, setTokens] = useState<TokenConfig[]>([]);
  const [tokenIn, setTokenIn] = useState<string>('');
  const [tokenOut, setTokenOut] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [quote, setQuote] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load tokens from registry
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const allTokens = await (window as any).everclawAPI.tokens.list();
        setTokens(allTokens.filter((t: TokenConfig) => t.chain === 'solana'));
      } catch (error) {
        console.error('Failed to load tokens:', error);
      }
    };
    loadTokens();
  }, []);

  // Set initial token from props
  useEffect(() => {
    if (inputToken) {
      setTokenIn(inputToken.symbol);
    }
  }, [inputToken]);

  // Get mint address for a token
  const getMintAddress = (symbol: string): string => {
    const token = tokens.find(t => t.symbol === symbol);
    if (!token) return '';
    if (token.contractAddress === 'native') {
      // Handle native SOL
      if (symbol === 'SOL') return 'So11111111111111111111111111111111111111112';
      return '';
    }
    return token.contractAddress;
  };

  // Get decimals for a token
  const getDecimals = (symbol: string): number => {
    const token = tokens.find(t => t.symbol === symbol);
    return token?.decimals || 9;
  };

  // Auto-fetch quote when amount or tokens change (debounced)
  useEffect(() => {
    if (!amount || !tokenIn || !tokenOut || tokenIn === tokenOut) {
      setQuote(null);
      return;
    }

    const timer = setTimeout(async () => {
      await fetchQuote();
    }, 500);

    return () => clearTimeout(timer);
  }, [amount, tokenIn, tokenOut]);

  const fetchQuote = async () => {
    if (!amount || !tokenIn || !tokenOut) return;

    setIsLoadingQuote(true);
    setError(null);

    try {
      const inputMint = getMintAddress(tokenIn);
      const outputMint = getMintAddress(tokenOut);

      if (!inputMint || !outputMint) {
        setError('Invalid token selection');
        return;
      }

      const decimals = getDecimals(tokenIn);
      const baseAmount = (parseFloat(amount) * Math.pow(10, decimals)).toString();

      const result = await (window as any).everclawAPI.solana.swap.quote(inputMint, outputMint, baseAmount);

      if (result.success) {
        setQuote(result.quote);
      } else {
        setError(result.error || 'Failed to get quote');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote');
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (!amount || !tokenIn || !tokenOut || !quote) return;

    setIsExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      const inputMint = getMintAddress(tokenIn);
      const outputMint = getMintAddress(tokenOut);

      if (!inputMint || !outputMint) {
        setError('Invalid token selection');
        return;
      }

      const decimals = getDecimals(tokenIn);
      const baseAmount = (parseFloat(amount) * Math.pow(10, decimals)).toString();

      const result = await (window as any).everclawAPI.solana.swap.execute(inputMint, outputMint, baseAmount);

      if (result.success && result.transactionHash) {
        setSuccess(`Swap successful! TX: ${result.transactionHash.slice(0, 8)}...${result.transactionHash.slice(-8)}`);
        setQuote(null);
        setAmount('');
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 3000);
      } else {
        setError(result.error || 'Swap failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const formatAmount = (amount: string, decimals: number) => {
    const num = parseInt(amount) / Math.pow(10, decimals);
    return num.toFixed(4);
  };

  // Token selector component
  const TokenSelector = ({ value, onChange, exclude }: { value: string; onChange: (v: string) => void; exclude?: string }) => {
    const selectedToken = tokens.find(t => t.symbol === value);
    return (
      <div className="relative flex items-center">
        {/* Token icon */}
        {selectedToken && (
          <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0">
            <img
              src={TOKEN_IMAGES[selectedToken.symbol]}
              alt={selectedToken.symbol}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`appearance-none pl-1 pr-7 py-2 rounded-lg border cursor-pointer transition-all text-sm font-medium ${isDark
            ? 'bg-transparent border-white/20 text-white hover:bg-white/10'
            : 'bg-transparent border-black/10 text-gray-900 hover:bg-gray-100'
            } focus:outline-none focus:border-green-500 [&>option]:bg-[#1a1d2e] [&>option]:text-white`}
        >
          <option value="" className={isDark ? 'text-gray-400' : 'text-gray-500'}>Select</option>
          {tokens
            .filter(t => t.symbol !== exclude)
            .map(t => (
              <option key={t.symbol} value={t.symbol} className="text-white bg-[#1a1d2e]">{t.symbol}</option>
            ))
          }
        </select>
        <ChevronDown
          size={14}
          className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div
        className={`relative w-full max-w-md mx-4 rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1a1d2e]/95 border-white/10' : 'bg-white/95 border-black/10 shadow-2xl'
          }`}
        style={{ backdropFilter: 'blur(20px)' }}
      >
        {/* Glass overlay effect */}
        <div className={`absolute inset-0 rounded-2xl ${isDark
          ? 'bg-gradient-to-br from-white/5 via-transparent to-white/5'
          : 'bg-gradient-to-br from-white/50 via-transparent to-white/30'
          }`} />

        {/* Header */}
        <div className={`relative flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10' : 'border-black/10'
          }`}>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Swap on Solana</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-white/10 transition ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="relative p-4 space-y-4">
          {/* Token In Section */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-black/5'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-muted)]">You Pay</span>
              {inputToken && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  Balance: {inputToken.balance}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex-1 flex items-center text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                }`}>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-transparent focus:outline-none"
                />
              </div>
              <TokenSelector value={tokenIn} onChange={setTokenIn} exclude={tokenOut} />
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center -my-1">
            <button
              onClick={() => {
                const temp = tokenIn;
                setTokenIn(tokenOut);
                setTokenOut(temp);
                setQuote(null);
              }}
              className={`p-3 rounded-full border transition-all ${isDark
                ? 'border-white/10 bg-[#1a1d2e] hover:bg-white/10 hover:border-white/20'
                : 'border-black/10 bg-white hover:bg-gray-100 hover:border-black/20'
                }`}
            >
              <ArrowDownUp size={18} className="text-green-500" />
            </button>
          </div>

          {/* Token Out Section */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-black/5'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-muted)]">You Receive</span>
              {isLoadingQuote && (
                <Loader2 size={14} className="animate-spin text-green-500" />
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex-1 text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                }`}>
                {quote ? (
                  formatAmount(quote.outAmount, getDecimals(tokenOut))
                ) : (
                  <span className="text-[var(--color-text-muted)]">-</span>
                )}
              </div>
              <TokenSelector value={tokenOut} onChange={(v) => { setTokenOut(v); setQuote(null); }} exclude={tokenIn} />
            </div>
          </div>

          {/* Swap Details */}
          {quote && (
            <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Rate</span>
                  <span className="text-[var(--color-text-primary)]">
                    1 {tokenIn} ≈ {quote.inAmount && quote.outAmount
                      ? (parseInt(quote.outAmount) / Math.pow(10, getDecimals(tokenOut)) /
                        (parseInt(quote.inAmount) / Math.pow(10, getDecimals(tokenIn)))).toFixed(4)
                      : '-'} {tokenOut}
                  </span>
                </div>
                {quote.priceImpactPct && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">Price Impact</span>
                    <span className={parseFloat(quote.priceImpactPct) > 1 ? 'text-red-400' : 'text-green-400'}>
                      {quote.priceImpactPct}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-xl bg-green-500/20 text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={handleExecuteSwap}
            disabled={!quote || isExecuting || isLoadingQuote}
            className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${!quote || isExecuting || isLoadingQuote
              ? isDark
                ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/25'
              }`}
          >
            {isExecuting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Swapping...
              </span>
            ) : (
              'Swap'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}