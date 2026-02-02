import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddPaymentReminderModal } from './AddPaymentReminderModal';
import { format, isPast, isToday, addDays } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PaymentReminder {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: 'upcoming' | 'paid' | 'missed';
  notify_before_days: number;
  is_recurring: boolean;
  recurring_interval: string | null;
  note: string | null;
}

export function PaymentRemindersManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatAmount } = useCurrency();
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<PaymentReminder | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'paid' | 'missed'>('all');

  useEffect(() => {
    if (user) fetchReminders();
  }, [user]);

  const fetchReminders = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('payment_reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (data) setReminders(data as PaymentReminder[]);
  };

  const handleMarkAsPaid = async (id: string) => {
    const { error } = await supabase
      .from('payment_reminders')
      .update({ status: 'paid' })
      .eq('id', id);

    if (!error) {
      toast({ title: 'Marked as paid' });
      fetchReminders();
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase
      .from('payment_reminders')
      .delete()
      .eq('id', deletingId);

    if (!error) {
      toast({ title: 'Reminder deleted' });
      fetchReminders();
    }
    setDeletingId(null);
  };

  const getStatusIcon = (status: string, dueDate: string) => {
    if (status === 'paid') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'missed' || (status === 'upcoming' && isPast(new Date(dueDate)) && !isToday(new Date(dueDate)))) {
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
    return <Clock className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusColor = (status: string, dueDate: string) => {
    if (status === 'paid') return 'bg-green-500/10 text-green-500';
    if (status === 'missed' || (status === 'upcoming' && isPast(new Date(dueDate)) && !isToday(new Date(dueDate)))) {
      return 'bg-destructive/10 text-destructive';
    }
    return 'bg-yellow-500/10 text-yellow-500';
  };

  const filteredReminders = reminders.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'missed' && r.status === 'upcoming' && isPast(new Date(r.due_date)) && !isToday(new Date(r.due_date))) {
      return true;
    }
    return r.status === filter;
  });

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'upcoming', 'paid', 'missed'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? 'bg-accent' : ''}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Add button */}
      <Button
        onClick={() => setShowAddModal(true)}
        className="w-full bg-accent hover:bg-accent/90"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Payment Reminder
      </Button>

      {/* Reminders list */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredReminders.map((reminder, index) => (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-xl p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${getStatusColor(reminder.status, reminder.due_date)}`}>
                    {getStatusIcon(reminder.status, reminder.due_date)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{reminder.title}</h3>
                    <p className="text-lg font-bold text-accent">{formatAmount(reminder.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(reminder.due_date), 'MMM dd, yyyy')}
                    </p>
                    {reminder.is_recurring && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {reminder.recurring_interval}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  {reminder.status !== 'paid' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMarkAsPaid(reminder.id)}
                      className="h-8 w-8 text-green-500 hover:text-green-600"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeletingId(reminder.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredReminders.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-muted-foreground"
          >
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No payment reminders found</p>
          </motion.div>
        )}
      </div>

      <AddPaymentReminderModal
        open={showAddModal || !!editingReminder}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingReminder(null);
          }
        }}
        onSuccess={fetchReminders}
        reminder={editingReminder}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment reminder? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
