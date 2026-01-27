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
                  whileHover={{ y: -8, scale: 1.1 }}
                  whileTap={{ scale: 0.85, rotate: 90 }}
                  animate={{
                    boxShadow: [
                      '0 8px 24px -4px rgba(251, 146, 60, 0.4)',
                      '0 12px 32px -4px rgba(251, 146, 60, 0.6)',
                      '0 8px 24px -4px rgba(251, 146, 60, 0.4)',
                    ],
                  }}
                  transition={{
                    boxShadow: {
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }}
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
                  'relative flex flex-col items-center justify-center gap-1 p-2 rounded-2xl w-full',
                  isActive ? 'text-accent' : 'text-muted-foreground'
                )}
                animate={{
                  scale: isActive ? 1.05 : 1,
                  y: isActive ? -2 : 0,
                }}
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    rotate: isActive ? [0, -5, 5, 0] : 0,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Icon className={cn('w-5 h-5', isActive && 'fill-accent/10 icon-glow')} />
                </motion.div>
                <motion.span
                  className={cn('text-[10px] font-bold tracking-tight')}
                  animate={{
                    opacity: isActive ? 1 : 0.6,
                    y: isActive ? 0 : 2,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {item.label}
                </motion.span>
                {isActive && (
                  <motion.div
                    className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-accent shadow-lg"
                    layoutId="nav-indicator"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    style={{ boxShadow: '0 0 8px currentColor' }}
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