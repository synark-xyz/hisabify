import { motion } from 'framer-motion';
import { Home, List, Plus, HandCoins, Target } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  onAddClick: () => void;
}

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/budget', icon: Target, label: 'Planner' },
  null, // Placeholder for the center FAB
  { path: '/savings', icon: HandCoins, label: 'Savings' },
  { path: '/expenses', icon: List, label: 'Expenses' },
];

export function BottomNavigation({ onAddClick }: BottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 glass bg-card/95 backdrop-blur-xl border-t border-border/50"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around pt-3 pb-2 px-4">
        {navItems.map((item, index) => {
          if (item === null) {
            // Center FAB Button
            return (
              <motion.button
                key="add-button"
                onClick={onAddClick}
                className="relative -mt-8 w-14 h-14 rounded-full shadow-fab bg-accent flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-6 h-6 text-white" />
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
                'relative flex flex-col items-center gap-1 p-2 rounded-xl transition-colors min-w-[48px]',
                isActive ? 'text-accent' : 'text-muted-foreground'
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Icon className={cn('w-5 h-5', isActive && item.path === '/' && 'fill-accent')} />
              {isActive && (
                <motion.div
                  className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent"
                  layoutId={`nav-indicator-${item.path}`}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}