import { AlertTriangle } from 'lucide-react';

interface SeedPhraseWarningProps {
  title: string;
  description: string;
}

export default function SeedPhraseWarning({ title, description }: SeedPhraseWarningProps) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
      <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
      <div>
        <p className="text-amber-500 font-medium text-sm">{title}</p>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </div>
  );
}