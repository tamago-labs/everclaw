import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Shield, Copy, Check, Download, Upload, AlertTriangle } from 'lucide-react';
import PageWrapper from '../components/common/PageWrapper';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';

type SetupStep = 'choice' | 'create' | 'import' | 'confirm' | 'success';
type WalletAction = 'create' | 'import' | null;

export default function SetupWalletPage() {
  const navigate = useNavigate();
  const { createWallet, restoreWallet, generateMnemonic } = useWallet();
  const { showToast } = useToast();
  
  const [step, setStep] = useState<SetupStep>('choice');
  const [action, setAction] = useState<WalletAction>(null);
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [importPhrase, setImportPhrase] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChoice = async (choice: 'create' | 'import') => {
    setAction(choice);
    if (choice === 'create') {
      const mnemonic = await generateMnemonic(24);
      setSeedPhrase(mnemonic);
      setStep('create');
    } else {
      setStep('import');
    }
  };

  const handleCreateContinue = () => {
    setStep('confirm');
  };

  const handleImportContinue = () => {
    if (importPhrase.trim().split(' ').length >= 12) {
      setSeedPhrase(importPhrase.trim());
      setStep('confirm');
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (action === 'create') {
        await createWallet(24);
        showToast('Wallet created successfully!', 'success');
      } else {
        await restoreWallet(importPhrase.trim());
        showToast('Wallet restored successfully!', 'success');
      }
      setStep('success');
    } catch (error) {
      console.error('Failed to setup wallet:', error);
      showToast('Failed to setup wallet. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToOverview = () => {
    navigate('/');
  };

  const handleCopySeed = async () => {
    await navigator.clipboard.writeText(seedPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderStep = () => {
    switch (step) {
      case 'choice':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-accent-primary" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Setup Your Wallet</h2>
              <p className="text-gray-400">Choose how you want to get started</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create New Wallet */}
              <button
                onClick={() => handleChoice('create')}
                className="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-white/10 hover:border-accent-primary/50 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center mb-4 group-hover:bg-accent-primary/20 transition-colors">
                  <Download size={24} className="text-accent-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Create New Wallet</h3>
                <p className="text-gray-400 text-sm">Generate a new secure wallet with a fresh seed phrase</p>
              </button>

              {/* Import Existing Wallet */}
              <button
                onClick={() => handleChoice('import')}
                className="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-white/10 hover:border-accent-primary/50 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center mb-4 group-hover:bg-accent-primary/20 transition-colors">
                  <Upload size={24} className="text-accent-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Import Existing Wallet</h3>
                <p className="text-gray-400 text-sm">Restore your wallet using an existing seed phrase</p>
              </button>
            </div>
          </div>
        );

      case 'create':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Your Recovery Phrase</h2>
              <p className="text-gray-400">Write down these 24 words and store them safely. This is the only way to recover your wallet.</p>
            </div>

            {/* Warning banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-amber-500 font-medium text-sm">Never share your seed phrase</p>
                <p className="text-gray-400 text-sm">Anyone with this phrase can access your funds. We will never ask for it.</p>
              </div>
            </div>

            {/* Seed phrase display */}
            <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-white/10 mb-6">
              <div className="grid grid-cols-3 gap-3">
                {seedPhrase.split(' ').map((word, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-gray-500 text-xs w-6">{index + 1}.</span>
                    <span className="text-white font-mono text-sm">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopySeed}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors mb-6"
            >
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>

            <button
              onClick={handleCreateContinue}
              className="w-full px-6 py-3 bg-accent-primary text-[#0F1117] rounded-xl font-semibold hover:bg-accent-primary/90 transition-colors"
            >
              I've written it down, continue
            </button>
          </div>
        );

      case 'import':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Import Your Wallet</h2>
              <p className="text-gray-400">Enter your 12 or 24 word recovery phrase</p>
            </div>

            {/* Warning banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-amber-500 font-medium text-sm">Your seed phrase stays local</p>
                <p className="text-gray-400 text-sm">Your recovery phrase is encrypted and stored only on this device.</p>
              </div>
            </div>

            {/* Import input */}
            <div className="mb-6">
              <textarea
                value={importPhrase}
                onChange={(e) => setImportPhrase(e.target.value)}
                placeholder="Enter your seed phrase (12 or 24 words)"
                className="w-full h-40 bg-[var(--color-bg-card)] rounded-xl p-4 border border-white/10 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-accent-primary/50"
              />
              <p className="text-gray-500 text-sm mt-2">
                {importPhrase.trim() ? `${importPhrase.trim().split(/\s+/).filter(Boolean).length} words` : 'Enter words separated by spaces'}
              </p>
            </div>

            <button
              onClick={handleImportContinue}
              disabled={importPhrase.trim().split(/\s+/).filter(Boolean).length < 12}
              className="w-full px-6 py-3 bg-accent-primary text-[#0F1117] rounded-xl font-semibold hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        );

      case 'confirm':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Almost Done!</h2>
              <p className="text-gray-400">
                {action === 'create' 
                  ? 'Your wallet will be created with the seed phrase you just saved.' 
                  : 'Your wallet will be restored using your seed phrase.'}
              </p>
            </div>

            {/* Summary */}
            <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-white/10 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Shield size={20} className="text-green-500" />
                </div>
                <div>
                  <p className="text-white font-medium">Your wallet will support:</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {['Ethereum', 'Solana', 'Bitcoin'].map((chain) => (
                  <div key={chain} className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-white text-sm font-medium">{chain}</p>
                    <p className="text-gray-500 text-xs">Mainnet</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
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

      case 'success':
        return (
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Wallet Created!</h2>
            <p className="text-gray-400 mb-8">
              Your wallet has been {action === 'create' ? 'created' : 'restored'} successfully. You can now view your accounts on the Overview page.
            </p>
            <button
              onClick={handleGoToOverview}
              className="px-8 py-3 bg-accent-primary text-[#0F1117] rounded-xl font-semibold hover:bg-accent-primary/90 transition-colors"
            >
              Go to Overview
            </button>
          </div>
        );
    }
  };

  return (
    <PageWrapper title="Setup Wallet">
      <div className="py-8">
        {renderStep()}
      </div>
    </PageWrapper>
  );
}