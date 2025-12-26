import { motion, AnimatePresence } from 'framer-motion';
import { Home, List, Plus, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface BottomNavigationProps {
  onAddClick: () => void;
}

export function BottomNavigation({ onAddClick }: BottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddClick = () => {
    setShowAddMenu(true);
  };

  const handleActionClick = (action: 'expense' | 'income' | 'transfer') => {
    setShowAddMenu(false);
    onAddClick();
  };

  return (
    <>
      {/* Add Action Menu Overlay */}
      <AnimatePresence>
        {showAddMenu && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddMenu(false)}
            />
            <motion.div
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {[
                { label: 'Add Expense', color: 'bg-accent', delay: 0 },
                { label: 'Add Income', color: 'bg-emerald-500', delay: 0.05 },
                { label: 'Add Transfer', color: 'bg-primary', delay: 0.1 },
              ].map((item, index) => (
                <motion.button
                  key={item.label}
                  onClick={() => handleActionClick('expense')}
                  className={cn(
                    'px-6 py-3 rounded-full text-white font-medium shadow-lg',
                    item.color
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: item.delay }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.label}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <motion.nav
        className="fixed bottom-0 left-0 right-0 z-50 glass bg-card/80 border-t border-border/50 safe-bottom"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="max-w-md mx-auto flex items-center justify-around h-20 px-6">
          {/* Home */}
          <motion.button
            onClick={() => navigate('/')}
            className={cn(
              'relative flex flex-col items-center gap-1 p-3 rounded-xl transition-colors',
              location.pathname === '/' ? 'text-accent' : 'text-muted-foreground'
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Home className={cn('w-6 h-6', location.pathname === '/' && 'fill-accent')} />
            {location.pathname === '/' && (
              <motion.div
                className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent"
                layoutId="activeIndicator"
              />
            )}
          </motion.button>

          {/* Add Button */}
          <motion.button
            onClick={showAddMenu ? () => setShowAddMenu(false) : handleAddClick}
            className={cn(
              'relative -mt-8 w-16 h-16 rounded-full shadow-fab flex items-center justify-center transition-colors',
              showAddMenu ? 'bg-muted-foreground' : 'bg-accent'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ rotate: showAddMenu ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {showAddMenu ? (
              <X className="w-7 h-7 text-white" />
            ) : (
              <Plus className="w-7 h-7 text-white" />
            )}
          </motion.button>

          {/* Transactions */}
          <motion.button
            onClick={() => navigate('/expenses')}
            className={cn(
              'relative flex flex-col items-center gap-1 p-3 rounded-xl transition-colors',
              location.pathname === '/expenses' ? 'text-accent' : 'text-muted-foreground'
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <List className="w-6 h-6" />
            {location.pathname === '/expenses' && (
              <motion.div
                className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent"
                layoutId="activeIndicator"
              />
            )}
          </motion.button>
        </div>
      </motion.nav>
    </>
  );
}
