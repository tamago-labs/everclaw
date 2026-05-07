import { Check } from 'lucide-react';

interface WalletSuccessStepProps {
  action: 'create' | 'import';
  onGoToOverview: () => void;
}

export default function WalletSuccessStep({ action, onGoToOverview }: WalletSuccessStepProps) {
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
        onClick={onGoToOverview}
        className="px-8 py-3 bg-accent-primary text-[#0F1117] rounded-xl font-semibold hover:bg-accent-primary/90 transition-colors"
      >
        Go to Overview
      </button>
    </div>
  );
}