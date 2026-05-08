import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Trash2, Copy, Check } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useToast } from '../../context/ToastContext';
import ConfirmModal from '../common/ConfirmModal';

export default function WalletTab() {
  const navigate = useNavigate();
  const { hasWallet, revealSeedPhrase, deleteWallet } = useWallet();
  const { showToast } = useToast();

  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRevealRequest = () => {
    setShowRevealConfirm(true);
  };

  const handleRevealConfirm = async () => {
    setShowRevealConfirm(false);
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

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteWallet();
      setSeedPhrase(null);
      setIsVisible(false);
      setShowDeleteConfirm(false);
      showToast('Wallet removed successfully', 'success');
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      showToast('Failed to remove wallet', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateWallet = () => {
    navigate('/setup-wallet');
  };

  return (
    <div className="space-y-6">
      {/* Wallet Status */}
      <div className="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-6">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${hasWallet ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="text-lg font-semibold text-[var(--color-text-primary)]">
            {hasWallet ? 'Wallet Configured' : 'No Wallet'}
          </span>
        </div>
      </div>

      {/* No Wallet State */}
      {!hasWallet && (
        <div className="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-6">
          <p className="text-[var(--color-text-muted)] text-sm mb-4">
            Create a wallet to start using private local AI agents for Solana and Ethereum.
          </p>
          <button
            onClick={handleCreateWallet}
            className="px-4 py-2.5 bg-accent-primary hover:bg-accent-primary/90 text-[#0F1117] font-semibold rounded-xl transition-colors"
          >
            Create Wallet
          </button>
        </div>
      )}

      {/* Recovery Phrase */}
      {hasWallet && (
        <div className="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-6">
          <h3 className="text-[var(--color-text-primary)] font-semibold mb-4">Recovery Phrase</h3>

          {!seedPhrase ? (
            <button
              onClick={handleRevealRequest}
              disabled={isRevealing}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary rounded-xl transition-colors disabled:opacity-50"
            >
              <Eye size={16} />
              {isRevealing ? 'Revealing...' : 'Reveal Seed Phrase'}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-[var(--color-bg-card)] rounded-xl p-4 border border-white/10">
                {isVisible ? (
                  <div className="grid grid-cols-3 gap-2">
                    {seedPhrase.split(' ').map((word, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-white/5 rounded px-2 py-1"
                      >
                        <span className="text-gray-500 text-xs w-5">{index + 1}.</span>
                        <span className="text-white text-xs font-mono">{word}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center font-mono">
                    •••••••••••• •••••••••••• ••••••••••••
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopySeed}
                  disabled={!isVisible}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={isVisible ? handleHideSeed : handleRevealRequest}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors"
                >
                  {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  {isVisible ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danger Zone */}
      {hasWallet && (
        <div className="rounded-xl bg-[var(--color-bg-surface)] border border-red-500/20 p-6">
          <h3 className="text-red-500 font-semibold mb-2">Danger Zone</h3>
          <p className="text-[var(--color-text-muted)] text-sm mb-4">
            Permanently delete your wallet. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting...' : 'Delete Wallet'}
          </button>
        </div>
      )}

      {/* Reveal Confirmation Modal */}
      <ConfirmModal
        isOpen={showRevealConfirm}
        title="Reveal Seed Phrase?"
        message="Never share your seed phrase with anyone. If someone gains access to it, they can control your funds."
        confirmText="Reveal"
        cancelText="Cancel"
        onConfirm={handleRevealConfirm}
        onCancel={() => setShowRevealConfirm(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Wallet?"
        message="Your wallet will be permanently deleted. Make sure you have backed up your seed phrase before proceeding."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}