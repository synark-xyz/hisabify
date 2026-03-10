import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, WarningCircle, Clock, TrendUp, Target, Heartbeat, Lightbulb, ShieldCheck, Receipt } from '@phosphor-icons/react';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { getNotifications, markNotificationAsRead, clearOldNotifications, AppNotification } from '@/lib/notificationManager';
import { useHealthScore } from '@/features/gamification/hooks/useHealthScore';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { toReminderDisplayDate } from '@/lib/reminderDate';
import { usePaymentReminders } from '@/hooks/usePaymentReminders';
import { PaymentReminder } from '@/types';
import { useState } from 'react';
import { PullToRefresh } from '@/components/PullToRefresh';

export function NotificationsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { formatAmount } = useCurrency();
    const { score, loading: healthLoading } = useHealthScore();
    const { reminders, loading, markAsPaid } = usePaymentReminders();
    const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);

    const fetchAppNotifications = useCallback(() => {
        const notifications = getNotifications();
        setAppNotifications(notifications);
    }, []);

    useEffect(() => {
        if (user) {
            fetchAppNotifications();
            clearOldNotifications(); // Clean up old notifications
        }
    }, [user, fetchAppNotifications]);

    const handleMarkAsPaid = async (reminder: PaymentReminder) => {
        await markAsPaid(reminder);
    };

    const handleRefresh = async () => {
        fetchAppNotifications();
        // Reminders will auto-refresh via hook
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
        }
    };

    const unreadNotificationsCount = appNotifications.filter(n => !n.read).length;
    const hasAnyNotifications = reminders.length > 0 || appNotifications.length > 0;

    const { variant } = useTheme();

    return (
        <div className={cn("min-h-screen", variant === 'cyberpunk' ? "bg-transparent" : "bg-background")}>
            <Header title="Notifications" showBack onBack={() => navigate('/')} />

            <PullToRefresh onRefresh={handleRefresh}>
                <main className="px-4 py-6 space-y-6">

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : !hasAnyNotifications ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                            <Bell className="w-10 h-10 text-muted-foreground/30" weight="duotone" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">All Caught Up</h3>
                        <p className="text-muted-foreground max-w-xs">
                            You have no pending notifications or payment reminders.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
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
                                                            <p className="text-base font-bold text-accent text-glow">{formatAmount(reminder.amount)}</p>
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

                        {/* Financial Health Section */}
                        {score && (
                            <section>
                                <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                    <Heartbeat className="w-4 h-4" />
                                    Financial Health
                                </h3>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-12 h-12 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="24" cy="24" r="20" stroke="currentColor" className="text-muted/20" strokeWidth="4" fill="transparent" />
                                                <circle
                                                    cx="24" cy="24" r="20"
                                                    stroke={score.total >= 80 ? '#10b981' : score.total >= 50 ? '#f59e0b' : '#f43f5e'}
                                                    strokeWidth="4" fill="transparent"
                                                    strokeDasharray={2 * Math.PI * 20}
                                                    strokeDashoffset={(1 - score.total / 100) * (2 * Math.PI * 20)}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <span className="absolute text-xs font-black">{score.total}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">Health Score: {score.total >= 80 ? 'Excellent' : score.total >= 50 ? 'Good' : 'Needs Work'}</p>
                                            <p className="text-xs text-muted-foreground">Keep up the discipline!</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-accent font-bold" onClick={() => navigate('/profile')}>
                                        Details
                                    </Button>
                                </motion.div>
                            </section>
                        )}

                        {/* Budget Analysis Section */}
                        {appNotifications.filter(n => n.type.startsWith('budget')).length > 0 && (
                            <section>
                                <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                    <WarningCircle className="w-4 h-4" />
                                    Budget Analysis
                                </h3>
                                <div className="space-y-3">
                                    {appNotifications
                                        .filter(n => n.type.startsWith('budget'))
                                        .map((notification, idx) => {
                                            const iconInfo = getNotificationIcon(notification.type);
                                            const Icon = iconInfo.icon;
                                            return (
                                                <motion.div
                                                    key={notification.id}
                                                    className={`p-4 rounded-2xl border transition-all ${notification.read
                                                        ? 'bg-muted/10 border-border/30 opacity-60'
                                                        : 'bg-amber-500/5 border-amber-500/20 shadow-sm'
                                                        }`}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    onClick={() => {
                                                        if (!notification.read) {
                                                            markNotificationAsRead(notification.id);
                                                            fetchAppNotifications();
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={`p-3 rounded-xl ${notification.read ? 'bg-muted/20' : iconInfo.bg}`}>
                                                            <Icon className={`w-5 h-5 ${notification.read ? 'text-muted-foreground' : iconInfo.color}`} weight="duotone" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-foreground truncate">{notification.title}</p>
                                                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{notification.description}</p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                </div>
                            </section>
                        )}

                        {/* Smart Financial Tips */}
                        <section>
                            <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-rose-500" />
                                Action Points & Tips
                            </h3>
                            <div className="space-y-3">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-start gap-4"
                                >
                                    <div className="p-3 bg-rose-500/10 rounded-xl">
                                        <ShieldCheck className="w-5 h-5 text-rose-500" weight="duotone" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground">Action Needed</p>
                                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                            You've exceeded your dining budget by 15%. Consider cooking at home for the next 3 days to balance it out.
                                        </p>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="p-4 rounded-2xl bg-muted/20 border border-border/50 flex items-start gap-4"
                                >
                                    <div className="p-3 bg-primary/10 rounded-xl">
                                        <TrendUp className="w-5 h-5 text-primary" weight="duotone" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-foreground">Savings Ticks</p>
                                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                            Transfering $20 more to your "New Phone" goal today would reach your target 5 days earlier!
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        </section>

                        {/* Goal Updates Section */}
                        {appNotifications.filter(n => !n.type.startsWith('budget')).length > 0 && (
                            <section>
                                <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Goal Updates
                                </h3>
                                <div className="space-y-3">
                                    {appNotifications
                                        .filter(n => !n.type.startsWith('budget'))
                                        .map((notification, idx) => {
                                            const iconInfo = getNotificationIcon(notification.type);
                                            const Icon = iconInfo.icon;
                                            return (
                                                <motion.div
                                                    key={notification.id}
                                                    className={`p-4 rounded-2xl border transition-all ${notification.read
                                                        ? 'bg-muted/20 border-border/50 opacity-60'
                                                        : 'bg-card border-border shadow-sm'
                                                        }`}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    onClick={() => {
                                                        if (!notification.read) {
                                                            markNotificationAsRead(notification.id);
                                                            fetchAppNotifications();
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={`p-3 rounded-xl ${iconInfo.bg}`}>
                                                            <Icon className={`w-5 h-5 ${iconInfo.color} icon-glow`} weight="duotone" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-foreground truncate">{notification.title}</p>
                                                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{notification.description}</p>
                                                            <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-tight font-black">
                                                                {format(new Date(notification.timestamp), 'MMM d, yyyy • h:mm a')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                </div>
                            </section>
                        )}

                        {reminders.length > 0 && (
                            <section>
                                <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Payment Reminders
                                </h3>
                                <div className="space-y-3">
                                    {reminders.map((reminder, index) => {
                                        const statusInfo = getStatusInfo(reminder.status, reminder.due_date);
                                        const Icon = statusInfo.icon;

                                        // Don't show overdue here again if we want to separate them, or show all? 
                                        // Let's show all but maybe visually distinguish.
                                        // Actually, common pattern is "All" excluding "Attention" if separated. 
                                        // But logically "All" implies All. 
                                        // Let's filter out the ones already shown in Overdue to avoid duplicates if Overdue section exists.
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
                                                        <p className="text-sm font-bold text-accent text-glow">{formatAmount(reminder.amount)}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                • {format(toReminderDisplayDate(reminder.due_date), 'MMM d, yyyy')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {reminder.status !== 'paid' && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleMarkAsPaid(reminder)}
                                                            className="shrink-0 h-10 w-10 p-0 rounded-xl"
                                                        >
                                                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 hover:border-accent hover:bg-accent/10 transition-all border-glow" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>
            </PullToRefresh>
        </div>
    );
}
