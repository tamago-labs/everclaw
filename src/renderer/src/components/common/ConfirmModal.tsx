import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  error?: string | null;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
  customContent?: React.ReactNode;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  error = null,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  customContent,
}: ConfirmModalProps) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50" />

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
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
          <button
            onClick={onCancel}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${
            isDark ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {error}
          </div>
        )}

        {customContent || (
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {message}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 px-4 py-3 rounded-xl border transition-colors ${
              isDark
                ? 'border-white/10 text-gray-400 hover:bg-white/5'
                : 'border-black/5 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${
              isDanger
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-accent-primary text-[#0F1117] hover:bg-accent-primary/90'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}