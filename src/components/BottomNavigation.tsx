import { motion } from 'framer-motion';
import { Home, List, Plus, PiggyBank, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  onAddClick: () => void;
}

export function BottomNavigation({ onAddClick }: BottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 glass bg-card/95 backdrop-blur-xl border-t border-border/50"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
      }}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="max-w-md mx-auto flex items-center justify-around pt-3 pb-2 px-4">
        {/* Home */}
        <motion.button
          onClick={() => navigate('/')}
          className={cn(
            'relative flex flex-col items-center gap-1 p-2 rounded-xl transition-colors',
            location.pathname === '/' ? 'text-accent' : 'text-muted-foreground'
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Home className={cn('w-5 h-5', location.pathname === '/' && 'fill-accent')} />
          {location.pathname === '/' && (
            <motion.div
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent"
              layoutId="activeIndicator"
            />
          )}
        </motion.button>

        {/* Budget */}
        <motion.button
          onClick={() => navigate('/budget')}
          className={cn(
            'relative flex flex-col items-center gap-1 p-2 rounded-xl transition-colors',
            location.pathname === '/budget' ? 'text-accent' : 'text-muted-foreground'
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Wallet className="w-5 h-5" />
          {location.pathname === '/budget' && (
            <motion.div
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent"
              layoutId="activeIndicator"
            />
          )}
        </motion.button>

        {/* Add Button */}
        <motion.button
          onClick={onAddClick}
          className="relative -mt-8 w-14 h-14 rounded-full shadow-fab bg-accent flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>

        {/* Savings */}
        <motion.button
          onClick={() => navigate('/savings')}
          className={cn(
            'relative flex flex-col items-center gap-1 p-2 rounded-xl transition-colors',
            location.pathname === '/savings' ? 'text-accent' : 'text-muted-foreground'
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <PiggyBank className="w-5 h-5" />
          {location.pathname === '/savings' && (
            <motion.div
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent"
              layoutId="activeIndicator"
            />
          )}
        </motion.button>

        {/* Transactions */}
        <motion.button
          onClick={() => navigate('/expenses')}
          className={cn(
            'relative flex flex-col items-center gap-1 p-2 rounded-xl transition-colors',
            location.pathname === '/expenses' ? 'text-accent' : 'text-muted-foreground'
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <List className="w-5 h-5" />
          {location.pathname === '/expenses' && (
            <motion.div
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-accent"
              layoutId="activeIndicator"
            />
          )}
        </motion.button>
      </div>
    </motion.nav>
  );
}