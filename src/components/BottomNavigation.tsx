import { motion, AnimatePresence } from 'framer-motion';
import { Home, List, Plus, HandCoins, Target, LayoutDashboardIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useVisualViewport } from '@/hooks/useVisualViewport';


interface BottomNavigationProps {
  onOpenInputSheet: () => void;
}

const dashboardLabel = 'Dashboard';
const budgetLabel = 'Budget';
const savingsLabel = 'Savings';
const expensesLabel = 'Expenses';
const navItems = [
  { path: '/', icon: LayoutDashboardIcon, label: 'Dashboard' },
  { path: '/budget', icon: Target, label: 'Budget' },
  null, // Placeholder for the center FAB
  { path: '/savings', icon: HandCoins, label: 'Savings' },
  { path: '/expenses', icon: List, label: 'Expenses' },
];

export function BottomNavigation({ onOpenInputSheet }: BottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isKeyboardOpen } = useVisualViewport();

  return (
    <AnimatePresence>
      {!isKeyboardOpen && (
        <motion.nav
          className="fixed bottom-0 left-0 right-0 z-50 glass bg-background/80 backdrop-blur-md border-t border-border/30 pb-nav-safe shadow-lg"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
      <div className="max-w-2xl mx-auto grid grid-cols-5 items-center h-20 md:h-20 relative">
        {navItems.map((item, index) => {
          if (item === null) {
            return (
              <div key="add-button-container" className="flex justify-center items-center">
                <motion.button
                  onClick={onOpenInputSheet}
                  className="relative -top-4 w-16 h-16 rounded-full bg-accent text-white shadow-fab flex items-center justify-center z-[51]"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Plus className="w-7 h-7" strokeWidth={2.5} />
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
                  'relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl w-full min-h-[64px]',
                  isActive ? 'text-accent' : 'text-muted-foreground'
                )}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Icon className={cn('w-6 h-6', isActive && 'fill-accent/10')} />
                <span
                  className={cn('text-[11px] font-semibold', isActive ? 'opacity-100' : 'opacity-60')}
                >
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    className="absolute top-0 w-8 h-0.5 rounded-full bg-accent"
                    layoutId="nav-indicator"
                    transition={{
                      type: 'spring',
                      stiffness: 350,
                      damping: 30,
                      mass: 0.8
                    }}
                  />
                )}
              </motion.button>
            </div>
          );
        })}
      </div>
    </motion.nav>
      )}
    </AnimatePresence>
  );
}