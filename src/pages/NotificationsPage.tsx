import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, WarningCircle, Clock, TrendUp, Target, Heartbeat, Lightbulb, Receipt, Trash } from '@phosphor-icons/react';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { generateWeeklyHealthNotification, generateWeeklyTip, AppNotification } from '@/lib/notificationManager';
import { useNotifications } from '@/hooks/useNotifications';
import { useHealthScore } from '@/features/gamification/hooks/useHealthScore';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { toReminderDisplayDate } from '@/lib/reminderDate';
import { usePaymentReminders } from '@/hooks/usePaymentReminders';
import { PaymentReminder } from '@/types';
import { PullToRefresh } from '@/components/PullToRefresh';
import { formatReminderAmount } from '@/lib/reminderAmount';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useState } from 'react';
import { TargetIcon } from 'lucide-react';

type ReminderItem = 
    | { type: 'payment'; data: PaymentReminder }
    | { type: 'budget'; data: AppNotification; status: 'warning' | 'exceeded' };

export function NotificationsPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { formatAmount } = useCurrency();
    const { score } = useHealthScore();
    const { reminders, loading, markAsPaid, deletePaidReminder } = usePaymentReminders();
    const { notifications: appNotifications, loading: notifLoading, unreadCount, refresh, markAsRead, remove, removeAll } = useNotifications();
    const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

    // Generate weekly tip on mount
    useEffect(() => {
        if (user) {
            generateWeeklyTip(user.id);
        }
    }, [user]);

    // Generate weekly health notification once score loads
    useEffect(() => {
        if (user && score) {
            const insight = score.total >= 80
                ? 'Great job! Your finances are in excellent shape this week.'
                : score.total >= 50
                    ? 'You\'re doing well. A few tweaks could push your score higher.'
                    : 'Your financial health needs attention. Review your budgets and spending.';
            generateWeeklyHealthNotification(user.id, score.total, insight);
        }
    }, [user, score]);

    const handleMarkAsPaid = async (reminder: PaymentReminder) => {
        await markAsPaid(reminder);
    };

    const handleDeletePaidReminder = async (reminder: PaymentReminder) => {
        await deletePaidReminder(reminder);
    };

    const handleRefresh = async () => {
        await refresh();
    };

    const getStatusInfo = (status: string, dueDate: string) => {
        const date = toReminderDisplayDate(dueDate);
        const daysUntil = differenceInDays(date, new Date());

        if (status === 'paid') {
            return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Paid' };
        }
        if (status === 'missed' || (status === 'upcoming' && isPast(date) && !isToday(date))) {
            return { icon: WarningCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Overdue' };
        }
        if (daysUntil <= 3) {
            return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}` };
        }
        return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Upcoming' };
    };

    const overdueCount = reminders.filter(r => {
        const dueDate = toReminderDisplayDate(r.due_date);
        return r.status === 'upcoming' && isPast(dueDate) && !isToday(dueDate);
    }).length;

    // Get budget alerts for Reminders tab
    const budgetAlerts = useMemo(() => {
        return appNotifications.filter(n => n.type === 'budget_warning' || n.type === 'budget_exceeded');
    }, [appNotifications]);

    const combinedReminders = useMemo<ReminderItem[]>(() => {
        const items: ReminderItem[] = [];
        
        // Add payment reminders
        reminders.forEach(r => {
            items.push({ type: 'payment', data: r });
        });
        
        // Add budget alerts (show unread ones first)
        budgetAlerts.forEach(b => {
            items.push({ 
                type: 'budget', 
                data: b, 
                status: b.type === 'budget_exceeded' ? 'exceeded' : 'warning' 
            });
        });
        
        // Sort by date (most recent first)
        return items.sort((a, b) => {
            if (a.type === 'payment' && b.type === 'payment') {
                return new Date(a.data.due_date).getTime() - new Date(b.data.due_date).getTime();
            }
            if (a.type === 'budget' && b.type === 'budget') {
                return new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime();
            }
            return 0;
        });
    }, [reminders, budgetAlerts]);

    const getNotificationIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'budget_warning':
                return { icon: WarningCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' };
            case 'budget_exceeded':
                return { icon: WarningCircle, color: 'text-destructive', bg: 'bg-destructive/10' };
            case 'goal_milestone':
                return { icon: TrendUp, color: 'text-blue-500', bg: 'bg-blue-500/10' };
            case 'goal_completed':
                return { icon: Target, color: 'text-green-500', bg: 'bg-green-500/10' };
            case 'push_notification':
                return { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-500/10' };
            case 'health_weekly':
                return { icon: Heartbeat, color: 'text-green-500', bg: 'bg-green-500/10' };
            case 'weekly_tip':
                return { icon: Lightbulb, color: 'text-rose-500', bg: 'bg-rose-500/10' };
        }
    };

    const { variant } = useTheme();

    return (
        <div className={cn("min-h-screen", variant === 'cyberpunk' ? "bg-transparent" : "bg-background")}>
            <Header title="Notifications" showBack />

            <PullToRefresh onRefresh={handleRefresh}>
                <main className="px-4 py-4">
                    <Tabs defaultValue="messages">
                        <TabsList className="w-full grid grid-cols-2 mb-4">
                            <TabsTrigger value="messages" className="relative">
                                Messages
                                {unreadCount > 0 && (
                                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-accent text-accent-foreground">
                                        {unreadCount}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="reminders" className="relative">
                                Reminders
                                {overdueCount + budgetAlerts.filter(b => !b.read).length > 0 && (
                                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                                        {overdueCount + budgetAlerts.filter(b => !b.read).length}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        {/* ===== Messages Tab ===== */}
                        <TabsContent value="messages">
                            {notifLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                                    ))}
                                </div>
                            ) : appNotifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                                        <Bell className="w-10 h-10 text-muted-foreground/30" weight="duotone" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">{t('notificationsPage.allCaughtUp')}</h3>
                                    <p className="text-muted-foreground max-w-xs">
                                        You have no notifications yet. They'll appear here as they come in.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Clear All button */}
                                    <div className="flex justify-end">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs text-muted-foreground hover:text-destructive"
                                            onClick={removeAll}
                                        >
                                            Clear All
                                        </Button>
                                    </div>

                                    {/* Flat chronological list */}
                                    {appNotifications.map((notification, idx) => {
                                        const iconInfo = getNotificationIcon(notification.type);
                                        const Icon = iconInfo.icon;
                                        return (
                                            <motion.div
                                                key={notification.id}
                                                className={cn(
                                                    "p-4 rounded-2xl border transition-all cursor-pointer",
                                                    notification.read
                                                        ? "bg-muted/10 border-border/30 opacity-60"
                                                        : "bg-accent/5 border-accent/30 shadow-sm ring-1 ring-accent/20"
                                                )}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                onClick={() => {
                                                    if (!notification.read) {
                                                        markAsRead(notification.id);
                                                    }
                                                    setSelectedNotification(notification);
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={cn("p-2.5 rounded-xl shrink-0", notification.read ? "bg-muted/20" : iconInfo.bg)}>
                                                        <Icon className={cn("w-5 h-5", notification.read ? "text-muted-foreground" : iconInfo.color)} weight="duotone" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            {!notification.read && (
                                                                <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                                                            )}
                                                            <p className="font-bold text-foreground truncate">{notification.title}</p>
                                                        </div>
                                                        {notification.description && (
                                                            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                                                                {notification.description}
                                                            </p>
                                                        )}
                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-tight font-black mt-1.5 block">
                                                            {format(new Date(notification.created_at), 'MMM d, yyyy • h:mm a')}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="shrink-0 h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-destructive"
                                                        aria-label="Delete notification"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            remove(notification.id);
                                                        }}
                                                    >
                                                        <Trash className="w-4 h-4" weight="duotone" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>

                        {/* ===== Reminders Tab ===== */}
                        <TabsContent value="reminders">
                            {loading || notifLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                                    ))}
                                </div>
                            ) : combinedReminders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                                        <Clock className="w-10 h-10 text-muted-foreground/30" weight="duotone" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">{t('notificationsPage.noReminders')}</h3>
                                    <p className="text-muted-foreground max-w-xs">
                                        You have no reminders. Add payment reminders or create budgets to get alerts.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Budget Alerts Section */}
                                    {budgetAlerts.length > 0 && (
                                        <section>
                                            <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                                <TargetIcon className="w-4 h-4" />
                                                Budget Alerts
                                            </h3>
                                            <div className="space-y-3">
                                                {budgetAlerts.map((alert, idx) => {
                                                    const isExceeded = alert.type === 'budget_exceeded';
                                                    const iconInfo = getNotificationIcon(alert.type);
                                                    const Icon = iconInfo.icon;
                                                    
                                                    return (
                                                        <motion.div
                                                            key={alert.id}
                                                            className={cn(
                                                                "p-4 rounded-2xl border transition-all cursor-pointer",
                                                                isExceeded 
                                                                    ? "bg-destructive/5 border-destructive/20" 
                                                                    : "bg-amber-500/5 border-amber-500/20",
                                                                alert.read && "opacity-60"
                                                            )}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.1 }}
                                                            onClick={() => {
                                                                if (!alert.read) {
                                                                    markAsRead(alert.id);
                                                                }
                                                                navigate('/budget');
                                                            }}
                                                        >
                                                            <div className="flex items-start gap-4">
                                                                <div className={cn("p-3 rounded-xl", iconInfo.bg)}>
                                                                    <Icon className={cn("w-5 h-5", iconInfo.color)} weight="duotone" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <p className={cn("font-bold truncate text-lg", isExceeded ? "text-destructive" : "text-foreground")}>
                                                                            {alert.title}
                                                                        </p>
                                                                    </div>
                                                                    {alert.description && (
                                                                        <p className="text-sm text-muted-foreground mt-1">
                                                                            {alert.description}
                                                                        </p>
                                                                    )}
                                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-tight font-black mt-1.5 block">
                                                                        {format(new Date(alert.created_at), 'MMM d, yyyy • h:mm a')}
                                                                    </span>
                                                                </div>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="shrink-0 h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-destructive"
                                                                    aria-label="Delete alert"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        remove(alert.id);
                                                                    }}
                                                                >
                                                                    <Trash className="w-4 h-4" weight="duotone" />
                                                                </Button>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    )}

                                    {/* Attention Needed (overdue payment reminders) */}
                                    {overdueCount > 0 && (
                                        <section>
                                            <h3 className="text-sm font-black text-destructive uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                                <WarningCircle className="w-4 h-4" />
                                                Attention Needed
                                            </h3>
                                            <div className="space-y-3">
                                                {reminders
                                                    .filter(r => {
                                                        const dueDate = toReminderDisplayDate(r.due_date);
                                                        return r.status === 'upcoming' && isPast(dueDate) && !isToday(dueDate);
                                                    })
                                                    .map((reminder, idx) => {
                                                        const statusInfo = getStatusInfo(reminder.status, reminder.due_date);
                                                        const Icon = statusInfo.icon;
                                                        return (
                                                            <motion.div
                                                                key={reminder.id}
                                                                className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20 card-3d transition-all"
                                                                initial={{ opacity: 0, y: 20 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: idx * 0.1 }}
                                                            >
                                                                <div className="flex items-start gap-4">
                                                                    <div className={`p-3 rounded-xl ${statusInfo.bg}`}>
                                                                        <Icon className={`w-5 h-5 ${statusInfo.color} icon-glow`} weight="duotone" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5 truncate">
                                                                            <Receipt className="w-4 h-4 text-destructive/50" />
                                                                            <p className="font-bold text-foreground truncate text-lg text-glow">{reminder.title}</p>
                                                                        </div>
                                                                        <p className="text-base font-bold text-accent text-glow">
                                                                            {formatReminderAmount(reminder, formatAmount)}
                                                                        </p>
                                                                        <p className="text-xs text-destructive mt-1 font-medium">
                                                                            Due: {format(toReminderDisplayDate(reminder.due_date), 'MMM d, yyyy')}
                                                                        </p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleMarkAsPaid(reminder)}
                                                                        className="shrink-0 h-10 px-4 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 border-glow"
                                                                    >
                                                                        Mark Paid
                                                                    </Button>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                            </div>
                                        </section>
                                    )}

                                    {/* All payment reminders (non-overdue) */}
                                    <section>
                                        <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Payment Reminders
                                        </h3>
                                        <div className="space-y-3">
                                            {reminders.map((reminder, index) => {
                                                const statusInfo = getStatusInfo(reminder.status, reminder.due_date);
                                                const Icon = statusInfo.icon;

                                                const reminderDate = toReminderDisplayDate(reminder.due_date);
                                                const isOverdue = reminder.status === 'upcoming' && isPast(reminderDate) && !isToday(reminderDate);
                                                if (isOverdue && overdueCount > 0) return null;

                                                return (
                                                    <motion.div
                                                        key={reminder.id}
                                                        className={`p-4 rounded-2xl border card-3d transition-all ${reminder.status === 'paid' ? 'bg-muted/20 border-border/50 opacity-60' : 'bg-card border-border shadow-sm'}`}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className={`p-3 rounded-xl ${statusInfo.bg}`}>
                                                                <Icon className={`w-5 h-5 ${statusInfo.color} icon-glow`} weight="duotone" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    <Receipt className={`w-3.5 h-3.5 ${statusInfo.color} opacity-40`} />
                                                                    <p className="font-bold text-foreground truncate">{reminder.title}</p>
                                                                </div>
                                                                <p className="text-sm font-bold text-accent text-glow">
                                                                    {formatReminderAmount(reminder, formatAmount)}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        • {format(toReminderDisplayDate(reminder.due_date), 'MMM d, yyyy')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {reminder.status !== 'paid' ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleMarkAsPaid(reminder)}
                                                                    className="shrink-0 h-10 w-10 p-0 rounded-xl"
                                                                >
                                                                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-accent hover:bg-accent/10 transition-all border-glow" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleDeletePaidReminder(reminder)}
                                                                    className="shrink-0 h-10 w-10 p-0 rounded-xl text-muted-foreground hover:text-destructive"
                                                                    aria-label={`Delete paid reminder ${reminder.title}`}
                                                                >
                                                                    <Trash className="w-4 h-4" weight="duotone" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </main>
            </PullToRefresh>

            {/* Notification Detail Dialog */}
            <Dialog open={!!selectedNotification} onOpenChange={(open) => { if (!open) setSelectedNotification(null); }}>
                <DialogContent className="max-w-[88vw] rounded-3xl p-0 gap-0 border-0 shadow-2xl overflow-y-auto">
                    {selectedNotification && (() => {
                        const iconInfo = getNotificationIcon(selectedNotification.type);
                        const Icon = iconInfo.icon;

                        return (
                            <>
                                {/* Colored icon header */}
                                <div className={`relative flex flex-col items-center pt-10 pb-7 px-6 ${iconInfo.bg}`}>
                                    <motion.div
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 bg-background/10"
                                    >
                                        <Icon className={`w-10 h-10 ${iconInfo.color}`} weight="duotone" />
                                    </motion.div>
                                </div>

                                {/* Content */}
                                <div className="bg-card px-6 pt-5 pb-6 space-y-4">
                                    <div className="text-center space-y-1">
                                        <DialogTitle className="text-lg font-bold text-foreground leading-snug">
                                            {selectedNotification.title}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                            {format(new Date(selectedNotification.created_at), 'MMM d, yyyy • h:mm a')}
                                        </DialogDescription>
                                    </div>

                                    {selectedNotification.description && (
                                        <p className="text-sm text-foreground/80 leading-relaxed text-center whitespace-pre-wrap">
                                            {selectedNotification.description}
                                        </p>
                                    )}

                                    {/* Image area — only rendered when an image URL exists */}
                                    {selectedNotification.image && (
                                        <div className="rounded-2xl overflow-hidden border border-border/30">
                                            <img
                                                src={selectedNotification.image}
                                                alt=""
                                                className="w-full h-auto max-h-[40vh] object-contain bg-muted/10"
                                                loading="lazy"
                                                onError={(e) => {
                                                    (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}

                                    {selectedNotification.deep_link ? (
                                        <Button
                                            className="w-full rounded-2xl h-12 font-bold text-sm"
                                            onClick={() => {
                                                const link = selectedNotification.deep_link!;
                                                setSelectedNotification(null);
                                                navigate(link);
                                            }}
                                        >
                                            Open Related Page
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="w-full rounded-2xl h-12 font-bold text-sm border-border/50"
                                            onClick={() => setSelectedNotification(null)}
                                        >
                                            Dismiss
                                        </Button>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}
