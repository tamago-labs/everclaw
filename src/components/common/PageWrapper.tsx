import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function PageWrapper({ title, children, className = '' }: PageWrapperProps) {
  const { isDark } = useTheme();
  const gradientClass = isDark ? 'text-gradient-white' : 'text-gradient-light';

  return (
    <div className={`p-8 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className={`text-2xl font-bold   ${gradientClass}`}>
          {title}
        </h1>
      </motion.div>
      {children}
    </div>
  );
}
