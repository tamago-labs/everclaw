import { ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface GlassButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
}

export default function GlassButton({ icon, onClick, title, className = '' }: GlassButtonProps) {
  const { isDark } = useTheme();

  return (
    <div
      className={`relative overflow-hidden rounded-xl border transition-all leading-none ${className} ${
        isDark
          ? 'border-white/10'
          : 'border-black/5 shadow-md'
      }`}
      style={{
        background: isDark ? 'rgba(26, 29, 46, 0.6)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <button
        onClick={onClick}
        title={title}
        className={`relative z-10 p-2 transition-all ${
          isDark
            ? 'hover:bg-white/5 text-gray-400 hover:text-white'
            : 'hover:bg-gray-50 text-gray-500 hover:text-gray-700'
        }`}
      >
        {icon}
      </button>
      {/* Glass shine */}
      <div className={`absolute inset-0 rounded-xl ${
        isDark
          ? 'bg-gradient-to-br from-white/5 to-transparent'
          : 'bg-gradient-to-br from-white/80 to-transparent'
      }`} />
      <div className={`absolute top-0 left-0 w-full h-px ${
        isDark
          ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
          : 'bg-gradient-to-r from-transparent via-black/10 to-transparent'
      }`} />
    </div>
  );
}