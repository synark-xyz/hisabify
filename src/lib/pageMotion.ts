import { useReducedMotion, Variants } from 'framer-motion';

/**
 * Shared page motion, used by both the Layout <Outlet> and the standalone (chrome-less)
 * routes so every screen change reads the same.
 *
 * Enter is slightly longer than exit and exit is opacity-only: two screens sliding in
 * opposite directions is what made navigation feel like a slideshow rather than an app.
 */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

/** Motion disabled entirely for users who asked the OS for reduced motion. */
const staticVariants: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 },
};

export function usePageVariants(): Variants {
  return useReducedMotion() ? staticVariants : pageVariants;
}
