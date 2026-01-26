import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, WarningCircle, Clock } from '@phosphor-icons/react';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface PaymentReminder {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    status: string;
    is_recurring: boolean;
}

export function NotificationsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { formatAmount } = useCurrency();
    const [reminders, setReminders] = useState<PaymentReminder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchReminders();
        }
    }, [user]);

    const fetchReminders = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await supabase
            .from('payment_reminders')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });

        if (data) setReminders(data as PaymentReminder[]);
        setLoading(false);
    };

    const handleMarkAsPaid = async (id: string) => {
        // Optimistic update
        setReminders(current => current.map(r =>
            r.id === id ? { ...r, status: 'paid' } : r
        ));

        await supabase
            .from('payment_reminders')
            .update({ status: 'paid' })
            .eq('id', id);

        // Re-fetch to confirm
        fetchReminders();
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
            return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}` };
        }
        return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Upcoming' };
    };

    const upcomingCount = reminders.filter(r => {
        return r.status === 'upcoming' && !isPast(new Date(r.due_date));
    }).length;

    const overdueCount = reminders.filter(r => {
        return r.status === 'upcoming' && isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date));
    }).length;

    return (
        <div className="min-h-screen bg-background pb-page-content">
            <Header title="Notifications" showBack onBack={() => navigate('/')} />

            <main className="px-4 py-6 space-y-6 pt-[calc(env(safe-area-inset-top)+1rem)]">

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : reminders.length === 0 ? (
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
                                <h3 className="text-sm font-bold text-destructive uppercase tracking-widest mb-3 px-1">Attention Needed</h3>
                                <div className="space-y-3">
                                    {reminders
                                        .filter(r => r.status === 'upcoming' && isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date)))
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
                                                            <p className="font-bold text-foreground truncate text-lg text-glow">{reminder.title}</p>
                                                            <p className="text-base font-bold text-accent text-glow">{formatAmount(reminder.amount)}</p>
                                                            <p className="text-xs text-destructive mt-1 font-medium">
                                                                Due: {format(new Date(reminder.due_date), 'MMM d, yyyy')}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleMarkAsPaid(reminder.id)}
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

                        <section>
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">All Reminders</h3>
                            <div className="space-y-3">
                                {reminders.map((reminder, index) => {
                                    const statusInfo = getStatusInfo(reminder.status, reminder.due_date);
                                    const Icon = statusInfo.icon;

                                    // Don't show overdue here again if we want to separate them, or show all? 
                                    // Let's show all but maybe visually distinguish.
                                    // Actually, common pattern is "All" excluding "Attention" if separated. 
                                    // But logically "All" implies All. 
                                    // Let's filter out the ones already shown in Overdue to avoid duplicates if Overdue section exists.
                                    const isOverdue = reminder.status === 'upcoming' && isPast(new Date(reminder.due_date)) && !isToday(new Date(reminder.due_date));
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
                                                    <p className="font-bold text-foreground truncate">{reminder.title}</p>
                                                    <p className="text-sm font-bold text-accent text-glow">{formatAmount(reminder.amount)}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
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
                    </div>
                )}
            </main>
        </div>
    );
}
