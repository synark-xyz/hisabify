import { motion } from 'framer-motion';
import { Home, List, Plus, HandCoins, Target, LayoutDashboardIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';


interface BottomNavigationProps {
  onAddTransaction: () => void;
  onAddReminder?: () => void;
}

const navItems = [
  { path: '/', icon: LayoutDashboardIcon, label: 'Dashboard' },
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
      className="fixed bottom-0 left-0 right-0 z-50 glass bg-background/60 backdrop-blur-md border-t border-border/40 pb-nav-safe"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className="max-w-2xl mx-auto grid grid-cols-5 items-center h-16 md:h-18 relative">
        {navItems.map((item, index) => {
          if (item === null) {
            return (
              <div key="add-button-container" className="flex justify-center items-center">
                <motion.button
                  onClick={onAddTransaction}
                  className="relative -top-3 w-14 h-14 rounded-2xl bg-accent text-white shadow-fab flex items-center justify-center z-[51] border-glow"
                  whileHover={{ y: -6, scale: 1.05 }}
                  whileTap={{ scale: 0.9, rotate: 180 }}
                >
                  <Plus className="w-8 h-8 icon-glow" strokeWidth={3} />
                </motion.button>
              </div>
            );
          }

          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <div key={item.path} className="flex justify-center items-center">
              <motion.button
                onClick={() => navigate(item.path)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 p-2 rounded-2xl transition-all w-full',
                  isActive ? 'text-accent' : 'text-muted-foreground hover:bg-muted/30'
                )}
                whileTap={{ scale: 0.95, rotate: [0, -5, 5, 0] }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon className={cn('w-5 h-5', isActive && 'fill-accent/10 icon-glow')} />
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
            </div>
          );
        })}
      </div>
    </motion.nav>
  );
}