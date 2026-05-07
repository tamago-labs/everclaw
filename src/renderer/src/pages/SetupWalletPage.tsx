import { useState } from 'react';
import { useNavigate } from 'react-router';
import PageWrapper from '../components/common/PageWrapper';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import WalletChoiceStep from '../components/wallet/WalletChoiceStep';
import CreateWalletStep from '../components/wallet/CreateWalletStep';
import ImportWalletStep from '../components/wallet/ImportWalletStep';
import WalletConfirmStep from '../components/wallet/WalletConfirmStep';
import WalletSuccessStep from '../components/wallet/WalletSuccessStep';

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
    if (importPhrase.trim().split(' ').filter(Boolean).length >= 12) {
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
          <WalletChoiceStep
            onCreate={() => handleChoice('create')}
            onImport={() => handleChoice('import')}
          />
        );

      case 'create':
        return (
          <CreateWalletStep
            seedPhrase={seedPhrase}
            copied={copied}
            onCopy={handleCopySeed}
            onContinue={handleCreateContinue}
          />
        );

      case 'import':
        return (
          <ImportWalletStep
            importPhrase={importPhrase}
            onChange={setImportPhrase}
            onContinue={handleImportContinue}
            canContinue={importPhrase.trim().split(/\s+/).filter(Boolean).length >= 12}
          />
        );

      case 'confirm':
        return (
          <WalletConfirmStep
            action={action || 'create'}
            isLoading={isLoading}
            onConfirm={handleConfirm}
          />
        );

      case 'success':
        return (
          <WalletSuccessStep
            action={action || 'create'}
            onGoToOverview={handleGoToOverview}
          />
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