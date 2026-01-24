import { motion } from 'framer-motion';
import { Home, List, Plus, HandCoins, Target } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  onAddTransaction: () => void;
  onAddReminder?: () => void;
}

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/budget', icon: Target, label: 'Planner' },
  null, // Placeholder for the center FAB
  { path: '/savings', icon: HandCoins, label: 'Savings' },
  { path: '/expenses', icon: List, label: 'Expenses' },
];

export function BottomNavigation({ onAddTransaction }: BottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 glass bg-background/80 backdrop-blur-xl border-t border-border/40 pb-nav-safe"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around h-16 md:h-18 relative">
        {navItems.map((item, index) => {
          if (item === null) {
            return (
              <motion.button
                key="add-button"
                onClick={onAddTransaction}
                className="relative -top-3 w-14 h-14 rounded-2xl bg-accent text-white shadow-fab flex items-center justify-center z-51 active:scale-95 transition-transform"
                whileHover={{ y: -6, scale: 1.05 }}
              >
                <Plus className="w-8 h-8" strokeWidth={3} />
              </motion.button>
            );
          }

          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all min-w-[64px]',
                isActive ? 'text-accent' : 'text-muted-foreground hover:bg-muted/30'
              )}
              whileTap={{ scale: 0.9 }}
            >
              <Icon className={cn('w-5 h-5', isActive && 'fill-accent/10')} />
              <span className={cn('text-[10px] font-bold tracking-tight transition-opacity', isActive ? 'opacity-100' : 'opacity-60')}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  className="absolute -top-1 w-1 h-1 rounded-full bg-accent"
                  layoutId="nav-indicator"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}