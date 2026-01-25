import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCircle, Clock, WarningCircle } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday, differenceInDays } from 'date-fns';

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
}

export function Header({ title }: HeaderProps) {
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
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all duration-200 flex items-center justify-between px-4 py-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        onClick={() => navigate('/profile')}
        className="relative"
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
        transition={{ delay: 0.1 }}
      >
        {title}
      </motion.h1>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <motion.button
            className="relative w-12 h-12 rounded-full bg-card shadow-card flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell className="w-5 h-5 text-accent" weight="duotone" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 min-w-5 h-5 px-1 bg-accent rounded-full border-2 border-card flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{notificationCount}</span>
              </span>
            )}
          </motion.button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" weight="duotone" />
              Notifications
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)]">
            {reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="w-12 h-12 text-muted-foreground/50 mb-4" weight="duotone" />
                <p className="text-muted-foreground">No notifications</p>
                <p className="text-sm text-muted-foreground/70">Payment reminders will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 pr-2">
                {overdueCount > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-destructive mb-2">Overdue ({overdueCount})</h3>
                    {reminders
                      .filter(r => r.status === 'upcoming' && isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date)))
                      .map((reminder) => {
                        const statusInfo = getStatusInfo(reminder.status, reminder.due_date);
                        const Icon = statusInfo.icon;
                        return (
                          <motion.div
                            key={reminder.id}
                            className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 mb-2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${statusInfo.bg}`}>
                                <Icon className={`w-4 h-4 ${statusInfo.color}`} weight="duotone" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{reminder.title}</p>
                                <p className="text-sm font-bold text-accent">{formatAmount(reminder.amount)}</p>
                                <p className="text-xs text-muted-foreground">
                                  Due: {format(new Date(reminder.due_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsPaid(reminder.id)}
                                className="shrink-0"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" weight="duotone" />
                                Paid
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">All Reminders</h3>
                  {reminders.map((reminder, index) => {
                    const statusInfo = getStatusInfo(reminder.status, reminder.due_date);
                    const Icon = statusInfo.icon;
                    return (
                      <motion.div
                        key={reminder.id}
                        className="p-3 rounded-xl bg-card border border-border mb-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${statusInfo.bg}`}>
                            <Icon className={`w-4 h-4 ${statusInfo.color}`} weight="duotone" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{reminder.title}</p>
                            <p className="text-sm font-bold text-accent">{formatAmount(reminder.amount)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                              <span className="text-xs text-muted-foreground">
                                • {format(new Date(reminder.due_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                          {reminder.status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkAsPaid(reminder.id)}
                              className="shrink-0"
                            >
                              <CheckCircle className="w-4 h-4" weight="duotone" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </motion.header>
  );
}