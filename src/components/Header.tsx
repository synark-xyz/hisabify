import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle, Clock, WarningCircle, List, Pencil, Gear, Headset, CaretLeft } from '@phosphor-icons/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCurrency } from '@/hooks/useCurrency';
import { usePaymentReminders } from '@/hooks/usePaymentReminders';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentReminder } from '@/types';
import { useNotifications } from '@/hooks/useNotifications';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  variant?: 'default' | 'profile';
}

export function Header({ title, showBack, onBack, variant = 'default' }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { formatAmount } = useCurrency();
  const { reminders, markAsPaid } = usePaymentReminders();
  const { unreadCount: unreadMessagesCount } = useNotifications();
  const [open, setOpen] = useState(false);

  const userInitial = profile.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';
  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`;

  const getStatusInfo = (status: string, dueDate: string) => {
    const date = new Date(dueDate);
    const daysUntil = differenceInDays(date, new Date());

    if (status === 'paid') {
      return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Paid' };
    }
    if (status === 'missed' || (status === 'upcoming' && isPast(date) && !isToday(date))) {
      return { icon: WarningCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Overdue' };
    }
    if (daysUntil <= 3) {
      return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}` };
    }
    return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Upcoming' };
  };

  const upcomingCount = reminders.filter(r => {
    const date = new Date(r.due_date);
    return r.status === 'upcoming' && !isPast(date);
  }).length;

  const overdueCount = reminders.filter(r => {
    const date = new Date(r.due_date);
    return r.status === 'upcoming' && isPast(date) && !isToday(date);
  }).length;

  const notificationCount = upcomingCount + overdueCount + unreadMessagesCount;

  const handleMarkAsPaid = async (reminder: PaymentReminder) => {
    await markAsPaid(reminder);
  };

  const getClosePagePath = (pathname: string) => {
    if (pathname.startsWith('/profile/')) return '/profile';
    if (pathname === '/profile') return '/';
    if (pathname.startsWith('/settings/')) return '/settings';
    if (pathname === '/settings') return '/';
    if (pathname === '/privacy' || pathname === '/faq' || pathname === '/support') return '/settings';
    if (pathname === '/notifications') return '/';
    return '/';
  };

  const handleLeftAction = () => {
    if (showBack) {
      if (onBack) {
        onBack();
        return;
      }
      navigate(getClosePagePath(location.pathname));
      return;
    }

    navigate('/profile');
  };

  return (
    <motion.header
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl transition-all duration-200 flex items-center justify-between px-4 pb-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        onClick={handleLeftAction}
        className="relative flex items-center justify-center p-1"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {showBack ? (
          <div className="w-10 h-10 rounded-full bg-card shadow-sm border border-border/50 flex items-center justify-center">
            <CaretLeft className="w-5 h-5 text-foreground" weight="bold" />
          </div>
        ) : (
          <>
            <Avatar className="w-12 h-12 border-2 border-accent/30">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/20 text-foreground font-semibold">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
          </>
        )}
      </motion.button>

      <motion.h1
        className="text-xl font-bold text-foreground"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        {title}
      </motion.h1>

      <div className="flex items-center gap-3">
        {showBack ? (
          <div className="w-10" />
        ) : variant === 'profile' ? (
          <motion.button
            onClick={() => navigate('/profile/personal')}
            className="relative w-10 h-10 rounded-full bg-card shadow-card flex items-center justify-center border border-border/50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Pencil className="w-5 h-5 text-accent" weight="duotone" />
          </motion.button>
        ) : (
          <>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <div className="relative">
                  <motion.button
                    className="w-10 h-10 rounded-full bg-card shadow-card flex items-center justify-center border border-border/50 relative overflow-visible"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <List className="w-5 h-5 text-muted-foreground" weight="duotone" />
                  </motion.button>
                  {notificationCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-destructive rounded-full border-2 border-background flex items-center justify-center z-10 shadow-sm"
                    >
                      <span className="text-[10px] font-bold text-white leading-none">{notificationCount}</span>
                    </motion.span>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="bottom"
                align="end"
                className="w-60"
                sideOffset={12}
                alignOffset={-4}
                forceMount={undefined}
              >
                <DropdownMenuItem onClick={() => navigate('/notifications')} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4" weight="duotone" />
                    <span className="font-medium">Notifications</span>
                  </div>
                  {notificationCount > 0 && (
                    <span className="min-w-5 h-5 px-2 bg-destructive rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                      {notificationCount}
                    </span>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-3">
                  <Gear className="w-4 h-4" weight="duotone" />
                  <span className="font-medium">Settings</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/support')} className="gap-3">
                  <Headset className="w-4 h-4" weight="duotone" />
                  <span className="font-medium">Support</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>


          </>
        )}
      </div>
    </motion.header>
  );
}
