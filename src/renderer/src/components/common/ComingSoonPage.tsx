import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import PageWrapper from './PageWrapper';

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function ComingSoonPage({ icon: Icon, title, description }: ComingSoonProps) {
  return (
    <PageWrapper title={title}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center min-h-[400px]"
      >
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-accent-primary-dim flex items-center justify-center mx-auto mb-6">
            <Icon size={36} className="text-accent-primary" />
          </div>
          <p className="text-base text-[var(--color-text-muted)] mb-6">
            {description}
          </p>
          <span className="inline-block px-4 py-2 rounded-full bg-accent-primary-dim text-accent-primary text-sm font-semibold">
            Coming Soon
          </span>
        </div>
      </motion.div>
    </PageWrapper>
  );
}
