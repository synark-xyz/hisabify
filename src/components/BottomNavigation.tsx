import { motion, AnimatePresence } from 'framer-motion';
import { List, Target, LayoutDashboardIcon, Lightbulb, Grid } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useVisualViewport } from '@/hooks/useVisualViewport';


const getNavItems = (t: (key: string) => string) => [
  { path: '/', icon: LayoutDashboardIcon, label: t('nav.dashboard') },
  { path: '/budget', icon: Target, label: t('nav.budget') },
  { path: '/transactions', icon: List, label: t('nav.expenses') },
  { path: '/insights', icon: Lightbulb, label: t('nav.insights') },
  { path: '/more', icon: Grid, label: t('nav.more') },
];

export function BottomNavigation() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isKeyboardOpen } = useVisualViewport();
  const navItems = getNavItems(t);

  return (
    <AnimatePresence>
      {!isKeyboardOpen && (
        <motion.nav
          className="fixed bottom-0 left-0 right-0 z-40 glass bg-background/80 backdrop-blur-md border-t border-border/30 pb-nav-safe shadow-lg lg:hidden"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
      <div className="max-w-2xl mx-auto grid grid-cols-5 items-center h-20 md:h-20 relative">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/') && item.path !== '/';
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
                  className={cn('text-xs font-semibold max-w-full truncate', isActive ? 'opacity-100' : 'opacity-60')}
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
