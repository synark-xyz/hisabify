import { ReactNode, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowDown } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export const PullToRefresh = forwardRef<HTMLDivElement, PullToRefreshProps>(
  ({ onRefresh, children, className = '' }, ref) => {
    const {
      containerRef,
      isPulling,
      isRefreshing,
      pullDistance,
      progress
    } = usePullToRefresh({ onRefresh });

    return (
      <div
        ref={(node) => {
          // Handle both refs
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={`relative overflow-y-auto ${className}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Pull indicator */}
        <AnimatePresence>
          {(isPulling || isRefreshing) && pullDistance > 10 && (
            <motion.div
              className="absolute left-0 right-0 flex justify-center z-10 pointer-events-none"
              style={{ top: Math.min(pullDistance - 40, 40) }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="bg-card border border-border rounded-full p-2 shadow-lg">
                {isRefreshing ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <motion.div
                    animate={{ rotate: progress >= 100 ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArrowDown 
                      className="w-5 h-5 text-primary" 
                      style={{ opacity: Math.min(progress / 100, 1) }}
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content with pull transform */}
        <motion.div
          style={{
            transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : 'translateY(0)',
            transition: isPulling ? 'none' : 'transform 0.3s ease-out'
          }}
        >
          {children}
        </motion.div>
      </div>
    );
  }
);

PullToRefresh.displayName = 'PullToRefresh';