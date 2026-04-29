import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  asChild?: boolean;
}

export function IconButton({ className, children, ...props }: IconButtonProps) {
  return (
    <motion.button
      className={cn(
        'w-9 h-9 rounded-full bg-card border border-border/50 flex items-center justify-center',
        'hover:bg-accent/10 hover:border-accent/30 transition-colors shrink-0',
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}
