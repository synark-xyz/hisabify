import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const { containerRef, isPulling, isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh
  });

  // Optimized Material Design specs for better visibility
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 3.5;

  // Calculate arc length based on pull progress
  // Material Design: arc grows from 0 to ~270 degrees as you pull
  const minArcLength = circumference * 0.2; // Minimum 20% visible
  const maxArcLength = circumference * 0.75; // Maximum 75%

  const arcLength = isRefreshing
    ? maxArcLength // Full 75% arc when refreshing
    : Math.max(minArcLength, (progress / 100) * maxArcLength); // Grows with pull, minimum 20%

  // Rotation: continuous during refresh, incremental during pull
  const rotation = isRefreshing ? 360 : (progress / 100) * 180;

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
    >
      {/* Material Design Pull-to-Refresh Indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
            style={{
              height: `${Math.min(pullDistance, 60)}px`,
              paddingTop: 'calc(var(--safe-area-inset-top) + 4px)'
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Material Circular Progress */}
            <div className="relative flex items-center justify-center">
              {/* Background circle for contrast */}
              <div className="absolute w-10 h-10 rounded-full bg-background/90 backdrop-blur-sm shadow-sm" />

              <motion.svg
                width="44"
                height="44"
                viewBox="0 0 44 44"
                className="overflow-visible relative z-10"
                animate={{
                  rotate: isRefreshing ? rotation : 0
                }}
                transition={{
                  rotate: isRefreshing
                    ? {
                        repeat: Infinity,
                        duration: 1.4,
                        ease: 'linear'
                      }
                    : {
                        duration: 0.3,
                        ease: 'easeOut'
                      }
                }}
              >
                {/* Rotating arc */}
                <motion.circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  stroke="currentColor"
                  className={cn(
                    'origin-center transition-colors duration-300',
                    progress >= 100 || isRefreshing ? 'text-accent' : 'text-primary'
                  )}
                  style={{
                    strokeDasharray: `${arcLength} ${circumference}`,
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%',
                    filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2)) drop-shadow(0 0 1px currentColor)'
                  }}
                  animate={
                    isRefreshing
                      ? {
                          strokeDashoffset: [0, -circumference],
                          rotate: [0, 360]
                        }
                      : {
                          strokeDashoffset: 0,
                          rotate: rotation
                        }
                  }
                  transition={
                    isRefreshing
                      ? {
                          strokeDashoffset: {
                            repeat: Infinity,
                            duration: 1.4,
                            ease: 'linear'
                          },
                          rotate: {
                            repeat: Infinity,
                            duration: 1.4,
                            ease: 'linear'
                          }
                        }
                      : {
                          duration: 0.3,
                          ease: 'easeOut'
                        }
                  }
                />
              </motion.svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  );
}

PullToRefresh.displayName = 'PullToRefresh';