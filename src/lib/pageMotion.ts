import { Variants } from 'framer-motion';

/**
 * Page transitions are intentionally disabled.
 *
 * Fading/sliding the whole route tree fought with the scroll restore in Layout and the
 * Suspense fallback swap, which read as a flicker on navigation. Screens now swap
 * instantly; per-component motion inside a page is unaffected.
 */
export const pageVariants: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 },
};

export function usePageVariants(): Variants {
  return pageVariants;
}
