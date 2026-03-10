import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Calendar, Bell, CheckCircle2, Clock, AlertCircle, Edit } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { usePaymentReminders } from '@/hooks/usePaymentReminders';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { PaymentReminder } from '@/types';
import { cn } from '@/lib/utils';
import { toReminderDisplayDate } from '@/lib/reminderDate';
import { AddPaymentReminderModal } from './AddPaymentReminderModal';
import { EditRecurringReminderDialog } from './EditRecurringReminderDialog';
import { formatReminderAmount } from '@/lib/reminderAmount';

interface ManageRemindersModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reminders: PaymentReminder[];
    onRefresh: () => void;
}

export function ManageRemindersModal({ open, onOpenChange, reminders, onRefresh }: ManageRemindersModalProps) {
    const { formatAmount } = useCurrency();
    const { toast } = useToast();
    const { markAsPaid } = usePaymentReminders();
    const [editingReminder, setEditingReminder] = useState<PaymentReminder | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditConfirmDialog, setShowEditConfirmDialog] = useState(false);
    const [pendingEdit, setPendingEdit] = useState<PaymentReminder | null>(null);

    const handleEdit = (reminder: PaymentReminder) => {
        if (reminder.is_recurring) {
            // Show confirmation dialog for recurring reminders
            setPendingEdit(reminder);
            setShowEditConfirmDialog(true);
        } else {
            // Directly open edit modal for one-time reminders
            setEditingReminder(reminder);
            setShowAddModal(true);
        }
    };

    const handleEditConfirm = () => {
        if (pendingEdit) {
            setEditingReminder(pendingEdit);
            setShowAddModal(true);
            setPendingEdit(null);
            setShowEditConfirmDialog(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this reminder?')) return;

        const { error } = await supabase
            .from('payment_reminders')
            .delete()
            .eq('id', id);

        if (error) {
            toast({ title: 'Error deleting reminder', variant: 'destructive' });
        } else {
            toast({ title: 'Reminder deleted' });
            onRefresh();
        }
    };

    const handleToggleStatus = async (reminder: PaymentReminder) => {
        if (reminder.status === 'paid') {
            // Unpaid action: just update status back to upcoming
            const { error } = await supabase
                .from('payment_reminders')
                .update({ status: 'upcoming' })
                .eq('id', reminder.id);

            if (error) {
                toast({ title: 'Error updating status', variant: 'destructive' });
                return;
            }

            toast({ title: 'Marked as upcoming' });
            onRefresh();
        } else {
            // Mark as paid: use the hook's method for recurring logic
            const success = await markAsPaid(reminder);
            if (success) {
                onRefresh();
            }
        }
    };

    const getStatusInfo = (reminder: PaymentReminder) => {
        const dueDate = toReminderDisplayDate(reminder.due_date);
        const diff = differenceInDays(dueDate, new Date());

        if (reminder.status === 'paid') {
            return { label: 'Paid', icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' };
        }
        if (isPast(dueDate) && !isToday(dueDate)) {
            return { label: 'Overdue', icon: AlertCircle, color: 'text-rose-500', bgColor: 'bg-rose-500/10' };
        }
        if (diff <= 2) {
            return { label: `Due in ${diff}d`, icon: Clock, color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
        }
        return { label: 'Upcoming', icon: Calendar, color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
    };

    return (
        <>
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[66vh]">
                    {/* Close Button - Top Right */}
                    <DrawerClose asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive z-10"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </DrawerClose>

                    <div className="p-6 pb-0">
                        <DrawerHeader className="flex flex-row items-center justify-between mb-6 p-0 pr-10">
                            <DrawerTitle className="text-xl font-extrabold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent pr-3">
                                Manage Reminders
                            </DrawerTitle>
                            <Button
                                onClick={() => {
                                    setEditingReminder(null);
                                    setShowAddModal(true);
                                }}
                                size="sm"
                                className="bg-accent hover:bg-accent/90 text-white rounded-full px-4 h-9 gap-2 shadow-lg shadow-accent/20"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Add New</span>
                            </Button>
                        </DrawerHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-safe-nav space-y-3 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {reminders.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No reminders yet</p>
                                </div>
                            ) : (
                                reminders.map((reminder) => {
                                    const status = getStatusInfo(reminder);
                                    const StatusIcon = status.icon;

                                    return (
                                        <motion.div
                                            key={reminder.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="group relative bg-muted/30 hover:bg-muted/50 border border-border/50 rounded-2xl p-4 transition-all"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => handleToggleStatus(reminder)}
                                                        className={cn(
                                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm",
                                                            status.bgColor
                                                        )}
                                                    >
                                                        <StatusIcon className={cn("w-6 h-6", status.color)} />
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-foreground mb-0.5 line-clamp-2 break-words">{reminder.title}</h3>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {format(toReminderDisplayDate(reminder.due_date), 'MMM dd, yyyy')}
                                                            </span>
                                                            {reminder.is_recurring && (
                                                                <span className="bg-accent/10 text-accent px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                                                                    {reminder.recurring_interval}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-foreground">
                                                        {formatReminderAmount(reminder, formatAmount)}
                                                    </p>
                                                    <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                                                            onClick={() => handleEdit(reminder)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                                                            onClick={() => handleDelete(reminder.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </div>
                </DrawerContent>
            </Drawer>

            <AddPaymentReminderModal
                open={showAddModal}
                onOpenChange={setShowAddModal}
                reminder={editingReminder || undefined}
                onSuccess={() => {
                    onRefresh();
                    setShowAddModal(false);
                    setEditingReminder(null);
                }}
            />

            <EditRecurringReminderDialog
                open={showEditConfirmDialog}
                onOpenChange={setShowEditConfirmDialog}
                onConfirm={handleEditConfirm}
                reminderTitle={pendingEdit?.title || ''}
            />
        </>
    );
}
