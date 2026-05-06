import { useState } from 'react';
import { Eye, EyeOff, Trash2, AlertTriangle, Copy, Check } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useToast } from '../../context/ToastContext';

export default function WalletTab() {
  const { hasWallet, revealSeedPhrase, deleteWallet } = useWallet();
  const { showToast } = useToast();
  
  const [isRevealing, setIsRevealing] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRevealSeed = async () => {
    setIsRevealing(true);
    try {
      const phrase = await revealSeedPhrase();
      setSeedPhrase(phrase);
      setIsVisible(true);
    } catch (error) {
      console.error('Failed to reveal seed phrase:', error);
      showToast('Failed to reveal seed phrase', 'error');
    } finally {
      setIsRevealing(false);
    }
  };

  const handleHideSeed = () => {
    setIsVisible(false);
    setSeedPhrase(null);
  };

  const handleCopySeed = async () => {
    if (seedPhrase) {
      await navigator.clipboard.writeText(seedPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeleteWallet = async () => {
    try {
      await deleteWallet();
      setSeedPhrase(null);
      setIsVisible(false);
      setShowDeleteConfirm(false);
      showToast('Wallet removed successfully', 'success');
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      showToast('Failed to remove wallet', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet Status */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">Wallet Status</h3>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${hasWallet ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="text-gray-400 text-sm">
            {hasWallet ? 'Wallet is configured' : 'No wallet configured'}
          </span>
        </div>
      </div>

      {/* Reveal Seed Phrase */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">Recovery Phrase</h3>
        
        {!seedPhrase ? (
          <button
            onClick={handleRevealSeed}
            disabled={!hasWallet || isRevealing}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye size={16} />
            Reveal Seed Phrase
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-white/10">
              {isVisible ? (
                <div className="grid grid-cols-3 gap-2">
                  {seedPhrase.split(' ').map((word, index) => (
                    <div key={index} className="flex items-center gap-1 bg-white/5 rounded px-2 py-1">
                      <span className="text-gray-500 text-xs w-5">{index + 1}.</span>
                      <span className="text-white text-xs font-mono">{word}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center">•••••••••••• •••••••••••• ••••••••••••</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleCopySeed}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={isVisible ? handleHideSeed : handleRevealSeed}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                {isVisible ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        )}
        
        {!hasWallet && (
          <p className="text-gray-500 text-sm mt-2">Create a wallet first to reveal the seed phrase.</p>
        )}
      </div>

      {/* Remove Wallet */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">Danger Zone</h3>
        
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-red-500 font-medium text-sm">This action cannot be undone</p>
                <p className="text-gray-400 text-sm">Your wallet will be permanently deleted. Make sure you have backed up your seed phrase.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteWallet}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                Confirm Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!hasWallet}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            Remove Wallet
          </button>
        )}
      </div>
    </div>
  );
}