import { Home, CreditCard, Plus, Calendar, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  onAddClick: () => void;
}

const navItems = [
  { icon: Home, path: '/', label: 'Home' },
  { icon: CreditCard, path: '/cards', label: 'Cards' },
  { icon: null, path: 'add', label: 'Add' },
  { icon: Calendar, path: '/expenses', label: 'Expenses' },
  { icon: User, path: '/profile', label: 'Profile' },
];

export function BottomNavigation({ onAddClick }: BottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass bg-card/90 border-t border-border safe-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-4">
        {navItems.map((item, index) => {
          if (item.path === 'add') {
            return (
              <button
                key={index}
                onClick={onAddClick}
                className="relative -mt-6 w-14 h-14 rounded-full bg-accent shadow-fab flex items-center justify-center transform transition-transform active:scale-95"
              >
                <Plus className="w-7 h-7 text-accent-foreground" />
              </button>
            );
          }

          const Icon = item.icon!;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 transition-colors',
                isActive ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              <Icon className="w-6 h-6" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
