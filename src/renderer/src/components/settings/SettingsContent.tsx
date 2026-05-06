import { ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface SettingsContentProps {
  children: ReactNode;
}

export default function SettingsContent({ children }: SettingsContentProps) {
  const { isDark } = useTheme();

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl p-6 border ${
        isDark ? 'border-white/10' : 'border-black/5'
      }`}
      style={{
        background: isDark 
          ? 'rgba(26, 29, 46, 0.6)' 
          : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
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
        {children}
      </div>
    </div>
  );
}