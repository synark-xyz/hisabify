import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MiniDonutProps {
  value: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function MiniDonut({
  value,
  color,
  size = 60,
  strokeWidth = 5,
  className,
}: MiniDonutProps) {
  const diameter = 36;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const center = diameter / 2;

  return (
    <div className={cn('relative flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${diameter} ${diameter}`}
        className="w-full h-full transform -rotate-90"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          className="text-muted/20"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
        />
        {/* Progress */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground">
          {Math.round(value)}
        </span>
      </div>
    </div>
  );
}
