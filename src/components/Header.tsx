import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle, Clock, WarningCircle, List, Pencil, Gear, Lifebuoy, CaretLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PaymentReminder {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: string;
  is_recurring: boolean;
}

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  variant?: 'default' | 'profile';
}

export function Header({ title, showBack, onBack, variant = 'default' }: HeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { formatAmount } = useCurrency();
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [open, setOpen] = useState(false);

  const userInitial = profile.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';
  const avatarUrl = profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`;

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const fetchReminders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('payment_reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (data) setReminders(data as PaymentReminder[]);
  };

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

  const notificationCount = upcomingCount + overdueCount;

  const handleMarkAsPaid = async (id: string) => {
    await supabase
      .from('payment_reminders')
      .update({ status: 'paid' })
      .eq('id', id);
    fetchReminders();
  };

  return (
    <motion.header
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all duration-200 flex items-center justify-between px-4 pb-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        onClick={onBack || (() => navigate('/profile'))}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative">
                  <motion.button
                    className="w-10 h-10 rounded-full bg-card shadow-card flex items-center justify-center border border-border/50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <List className="w-5 h-5 text-muted-foreground" weight="duotone" />
                    {notificationCount > 0 && (
                      <span className="absolute top-0 right-0 min-w-4 h-4 px-1 bg-destructive rounded-full border-2 border-card flex items-center justify-center transform -translate-y-1 translate-x-1">
                        <span className="text-[9px] font-bold text-white">{notificationCount}</span>
                      </span>
                    )}
                  </motion.button>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/notifications')} className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </div>
                  {notificationCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 bg-destructive rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                      {notificationCount}
                    </span>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Gear className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Lifebuoy className="mr-2 h-4 w-4" />
                  <span>Support</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>


          </>
        )}
      </div>
    </motion.header>
  );
}