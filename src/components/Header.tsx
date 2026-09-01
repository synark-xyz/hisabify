import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle, Clock, WarningCircle, List, Gear, Headset } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { localizeNumber } from '@/lib/i18nNumber';

interface HeaderProps {
  /** A `nav.*` i18n key. Only the five tab routes render this header. */
  title: string;
}

/**
 * The landing appbar: avatar, page title, notifications and menu. Rendered by
 * `Layout` for tab routes only. Child pages use `PageShell` instead — this
 * component deliberately has no back mode, so there is one bar per role.
 */
export function Header({ title }: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { formatAmount } = useCurrency();
  const { reminders, markAsPaid } = usePaymentReminders();
  const { unreadCount: unreadMessagesCount } = useNotifications();
  const translatedTitle = t(title);
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

  const handleLeftAction = () => navigate('/profile');

  return (
    <motion.header
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl transition-all duration-200"
      style={{ paddingTop: 'calc(var(--safe-area-inset-top) + 8px)' }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between px-4 pb-4 lg:px-6 lg:pb-4 max-w-5xl mx-auto">
      <motion.button
        onClick={handleLeftAction}
        className="relative flex items-center justify-center p-1"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Avatar className="w-12 h-12 border-2 border-accent/30">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-gradient-to-br from-accent/20 to-primary/20 text-foreground font-semibold">
            {userInitial}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
      </motion.button>

      <motion.h1
        className="text-xl font-bold text-foreground"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
      >
        {translatedTitle}
      </motion.h1>

      <div className="flex items-center gap-3">
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
                      <span className="text-[10px] font-bold text-white leading-none">{localizeNumber(notificationCount)}</span>
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
                    <span className="font-medium">{t('notifications.notifications')}</span>
                  </div>
                  {notificationCount > 0 && (
                    <span className="min-w-5 h-5 px-2 bg-destructive rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                      {localizeNumber(notificationCount)}
                    </span>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-3">
                  <Gear className="w-4 h-4" weight="duotone" />
                  <span className="font-medium">{t('nav.settings')}</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/support')} className="gap-3">
                  <Headset className="w-4 h-4" weight="duotone" />
                  <span className="font-medium">{t('common.helpSupport')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
      </div>
      </div>
    </motion.header>
  );
}
