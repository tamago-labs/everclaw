import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

interface ModelInfo {
  name: string;
  specs: string;
  recommended: string;
}

interface SelectModelModalProps {
  isOpen: boolean;
  models: {
    '4B': ModelInfo;
    '1.7B': ModelInfo;
  };
  onSelect: (modelType: '4B' | '1.7B') => void;
  isLoading?: boolean;
}

export default function SelectModelModal({
  isOpen,
  models,
  onSelect,
  isLoading = false,
}: SelectModelModalProps) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop - no close on click, user must choose */}
      <motion.div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal */}
      <motion.div 
        className={`relative w-full max-w-md mx-4 rounded-2xl p-6 overflow-hidden ${
          isDark ? 'border border-white/10' : 'border border-black/5 shadow-xl'
        }`}
        style={{
          background: isDark
            ? 'rgba(26, 29, 46, 0.9)'
            : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Glass shine effect */}
        <div className={`absolute inset-0 rounded-2xl ${
          isDark
            ? 'bg-gradient-to-br from-white/5 to-transparent'
            : 'bg-gradient-to-br from-white/80 to-transparent'
        }`} />

        {/* Top highlight */}
        <div className={`absolute top-0 left-0 w-full h-px ${
          isDark
            ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
            : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
        }`} />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6"> 
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Choose Your Local AI Engine
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Different models are available depending on your PC’s performance
              </p>
            </div>
          </div>

          {/* Model Cards */}
          <div className="space-y-3">
            {(['1.7B', '4B'] as const).map((modelType, index) => {
              const model = models[modelType];
              const is4B = modelType === '4B';

              return (
                <motion.button
                  key={modelType}
                  onClick={() => onSelect(modelType)}
                  disabled={isLoading}
                  className={`w-full relative overflow-hidden rounded-xl p-4 text-left transition-all ${
                    isDark
                      ? 'border border-white/10 hover:border-accent-primary/50'
                      : 'border border-black/5 hover:border-accent-primary/50 shadow-sm'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{
                    background: isDark
                      ? 'rgba(26, 29, 46, 0.6)'
                      : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Glass shine */}
                  <div className={`absolute inset-0 rounded-xl ${
                    isDark
                      ? 'bg-gradient-to-br from-white/3 to-transparent'
                      : 'bg-gradient-to-br from-white/80 to-transparent'
                  }`} />
                  
                  {/* Top highlight */}
                  <div className={`absolute top-0 left-0 w-full h-px ${
                    isDark
                      ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent'
                      : 'bg-gradient-to-r from-transparent via-black/5 to-transparent'
                  }`} />

                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <h3 className={`font-semibold text-sm mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {model.name}
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {is4B 
                          ? '16GB+ RAM • ~3-4GB disk'
                          : '8GB+ RAM • ~1.5GB disk'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {is4B ? 'High Performance' : 'Recommended'}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}