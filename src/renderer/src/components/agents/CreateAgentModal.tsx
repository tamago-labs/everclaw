import { useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export default function CreateAgentModal({ isOpen, onClose, onCreate }: CreateAgentModalProps) {
  const { isDark } = useTheme();
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isCreating) return;

    setError(null);
    setSuccess(null);
    setIsCreating(true);
    
    try {
      await onCreate(name.trim());
      setSuccess('Agent created successfully!');
      setName('');
      // Close modal after short delay to show success
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md mx-4 rounded-2xl p-6 ${
          isDark ? 'bg-[#1a1d2e] border border-white/10' : 'bg-white border border-black/5 shadow-xl'
        }`}
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Create New Agent
          </h3>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${
            isDark ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${
            isDark ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-green-50 border border-green-200 text-green-600'
          }`}>
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={`block text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Agent Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            placeholder="e.g., meme-hunter, lending-helper, bridge-agent"
              className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-accent-primary'
                  : 'bg-gray-50 border-black/5 text-gray-900 placeholder-gray-400 focus:border-accent-primary'
              }`}
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className={`flex-1 px-4 py-3 rounded-xl border transition-colors ${
                isDark
                  ? 'border-white/10 text-gray-400 hover:bg-white/5'
                  : 'border-black/5 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
                isDark
                  ? 'bg-accent-primary text-[#0F1117] hover:bg-accent-primary/90'
                  : 'bg-accent-primary text-[#0F1117] hover:bg-accent-primary/90'
              }`}
            >
              {isCreating ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}