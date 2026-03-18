import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, WarningCircle, Clock, TrendUp, Target, Heartbeat, Lightbulb, Receipt, Trash } from '@phosphor-icons/react';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { getNotifications, markNotificationAsRead, clearOldNotifications, deleteNotification, clearAllNotifications, generateWeeklyHealthNotification, generateWeeklyTip, AppNotification } from '@/lib/notificationManager';
import { useHealthScore } from '@/features/gamification/hooks/useHealthScore';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { toReminderDisplayDate } from '@/lib/reminderDate';
import { usePaymentReminders } from '@/hooks/usePaymentReminders';
import { PaymentReminder } from '@/types';
import { PullToRefresh } from '@/components/PullToRefresh';
import { formatReminderAmount } from '@/lib/reminderAmount';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function NotificationsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { formatAmount } = useCurrency();
    const { score, loading: healthLoading } = useHealthScore();
    const { reminders, loading, markAsPaid, deletePaidReminder } = usePaymentReminders();
    const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
    const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

    const fetchAppNotifications = useCallback(() => {
        const notifications = getNotifications();
        setAppNotifications(notifications);
    }, []);

    useEffect(() => {
        if (user) {
            fetchAppNotifications();
            clearOldNotifications();
            generateWeeklyTip();
        }
    }, [user, fetchAppNotifications]);

    // Generate weekly health notification once score loads
    useEffect(() => {
        if (score) {
            const insight = score.total >= 80
                ? 'Great job! Your finances are in excellent shape this week.'
                : score.total >= 50
                    ? 'You\'re doing well. A few tweaks could push your score higher.'
                    : 'Your financial health needs attention. Review your budgets and spending.';
            generateWeeklyHealthNotification(score.total, insight);
            fetchAppNotifications();
        }
    }, [score, fetchAppNotifications]);

    // Live-refresh when a new push notification is stored while the page is open
    useEffect(() => {
        const handler = () => fetchAppNotifications();
        window.addEventListener('hisabify:push-notification', handler);
        return () => window.removeEventListener('hisabify:push-notification', handler);
    }, [fetchAppNotifications]);

    const handleMarkAsPaid = async (reminder: PaymentReminder) => {
        await markAsPaid(reminder);
    };

    const handleDeletePaidReminder = async (reminder: PaymentReminder) => {
        await deletePaidReminder(reminder);
    };

    const handleRefresh = async () => {
        fetchAppNotifications();
    };

    const handleClearAll = () => {
        clearAllNotifications();
        fetchAppNotifications();
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

    const unreadCount = appNotifications.filter(n => !n.read).length;

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
                                {overdueCount > 0 && (
                                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                                        {overdueCount}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        {/* ===== Messages Tab ===== */}
                        <TabsContent value="messages">
                            {appNotifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                                        <Bell className="w-10 h-10 text-muted-foreground/30" weight="duotone" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">All Caught Up</h3>
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
                                            onClick={handleClearAll}
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
                                                        markNotificationAsRead(notification.id);
                                                        fetchAppNotifications();
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
                                                            {format(new Date(notification.timestamp), 'MMM d, yyyy • h:mm a')}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="shrink-0 h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-destructive"
                                                        aria-label="Delete notification"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteNotification(notification.id);
                                                            fetchAppNotifications();
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
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                                    ))}
                                </div>
                            ) : reminders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                                        <Clock className="w-10 h-10 text-muted-foreground/30" weight="duotone" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">No Reminders</h3>
                                    <p className="text-muted-foreground max-w-xs">
                                        You have no payment reminders. Add some to stay on top of your bills.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Attention Needed (overdue) */}
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
                <DialogContent className="max-w-[92vw] rounded-2xl p-0 gap-0 border-border/50 max-h-[80vh]">
                    <DialogHeader className="px-5 pt-5 pb-3">
                        <div className="flex items-start gap-3">
                            {selectedNotification && (() => {
                                const iconInfo = getNotificationIcon(selectedNotification.type);
                                const Icon = iconInfo.icon;
                                return (
                                    <div className={`p-3 rounded-xl shrink-0 ${iconInfo.bg}`}>
                                        <Icon className={`w-5 h-5 ${iconInfo.color}`} weight="duotone" />
                                    </div>
                                );
                            })()}
                            <div className="flex-1 min-w-0">
                                <DialogTitle className="text-base font-bold text-foreground leading-snug">
                                    {selectedNotification?.title}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-1">
                                    {selectedNotification && format(new Date(selectedNotification.timestamp), 'MMMM d, yyyy \u2022 h:mm a')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="max-h-[50vh]">
                        <div className="px-5 pb-5 space-y-4">
                            {selectedNotification?.description && (
                                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                    {selectedNotification.description}
                                </p>
                            )}

                            {selectedNotification?.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                                <div className="space-y-2 pt-3 border-t border-border/50">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                        Details
                                    </p>
                                    {Object.entries(selectedNotification.metadata).map(([key, value]) => (
                                        <div key={key} className="flex justify-between items-center py-1.5">
                                            <span className="text-xs text-muted-foreground capitalize">
                                                {key.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-xs text-foreground font-medium text-right max-w-[60%] truncate">
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedNotification?.deepLink && (
                                <Button
                                    className="w-full rounded-xl"
                                    onClick={() => {
                                        const link = selectedNotification.deepLink!;
                                        setSelectedNotification(null);
                                        navigate(link);
                                    }}
                                >
                                    Open Related Page
                                </Button>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
