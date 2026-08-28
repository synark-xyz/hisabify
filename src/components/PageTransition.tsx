import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper for routes that live outside <Layout>. Route-level motion is disabled (see
 * lib/pageMotion), so this is now a plain container kept for the shared className slot.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={className}>{children}</div>;
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
