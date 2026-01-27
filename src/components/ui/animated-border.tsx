import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBorderProps {
  children: ReactNode;
  className?: string;
  borderWidth?: number;
  borderColor?: string;
  animationDuration?: number;
  glowIntensity?: number;
}

export function AnimatedBorder({
  children,
  className,
  borderWidth = 2,
  borderColor = '#00ffff',
  animationDuration = 3,
  glowIntensity = 10,
}: AnimatedBorderProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      {/* Animated LED border effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `linear-gradient(90deg,
            transparent 0%,
            transparent 25%,
            ${borderColor} 50%,
            transparent 75%,
            transparent 100%)`,
          backgroundSize: '400% 100%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '400% 0%'],
        }}
        transition={{
          duration: animationDuration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-2xl opacity-50 blur-sm"
        style={{
          boxShadow: `inset 0 0 ${glowIntensity}px ${borderColor}, 0 0 ${glowIntensity}px ${borderColor}`,
        }}
      />

      {/* Inner border mask */}
      <div
        className="absolute rounded-2xl"
        style={{
          inset: `${borderWidth}px`,
          background: 'hsl(var(--background))',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Simpler LED border for smaller elements
export function LEDBorder({
  children,
  className,
  color = '#00ffff',
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      {/* Top border animation */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 8px ${color}`,
        }}
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Right border animation */}
      <motion.div
        className="absolute top-0 right-0 bottom-0 w-[2px]"
        style={{
          background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 8px ${color}`,
        }}
        animate={{
          y: ['-100%', '200%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
          delay: 0.5,
        }}
      />

      {/* Bottom border animation */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 8px ${color}`,
        }}
        animate={{
          x: ['200%', '-100%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
          delay: 1,
        }}
      />

      {/* Left border animation */}
      <motion.div
        className="absolute top-0 left-0 bottom-0 w-[2px]"
        style={{
          background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 8px ${color}`,
        }}
        animate={{
          y: ['200%', '-100%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
          delay: 1.5,
        }}
      />

      {children}
    </div>
  );
}
