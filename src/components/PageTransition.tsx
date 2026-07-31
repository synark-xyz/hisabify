import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePageVariants } from '@/lib/pageMotion';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Enter-only wrapper for routes that live outside <Layout>. They are not inside a shared
 * AnimatePresence, so there is no exit phase to coordinate — animating in is the whole job.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const variants = usePageVariants();

  return (
    <motion.div variants={variants} initial="initial" animate="animate" className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Suspense fallback for lazily-loaded routes.
 *
 * Deliberately quiet: a spinner that appears for 80ms and vanishes reads as a flicker, so
 * this fades in after a short delay and most chunk loads finish before anything is drawn.
 */
export function PageFallback() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="flex items-center justify-center py-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, delay: 0.25 }}
      aria-busy="true"
    >
      <div className="w-7 h-7 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
    </motion.div>
  );
}
