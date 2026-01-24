import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, DollarSign, Bell, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { schedulePaymentReminder, requestNotificationPermission } from '@/lib/notifications';

interface AddPaymentReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  reminder?: any; // For editing
}

export function AddPaymentReminderModal({ open, onOpenChange, onSuccess, reminder }: AddPaymentReminderModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notifyBeforeDays, setNotifyBeforeDays] = useState('3');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<string>('monthly');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title);
      setAmount(reminder.amount.toString());
      setDueDate(format(new Date(reminder.due_date), 'yyyy-MM-dd'));
      setNotifyBeforeDays(reminder.notify_before_days.toString());
      setIsRecurring(reminder.is_recurring);
      setRecurringInterval(reminder.recurring_interval || 'monthly');
      setNote(reminder.note || '');
    } else {
      resetForm();
    }
  }, [reminder, open]);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDueDate('');
    setNotifyBeforeDays('3');
    setIsRecurring(false);
    setRecurringInterval('monthly');
    setNote('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const data = {
        user_id: user.id,
        title,
        amount: parseFloat(amount),
        due_date: new Date(dueDate).toISOString(),
        notify_before_days: parseInt(notifyBeforeDays),
        is_recurring: isRecurring,
        recurring_interval: isRecurring ? recurringInterval : null,
        note: note || null,
      };

      if (reminder) {
        const { error } = await supabase
          .from('payment_reminders')
          .update(data)
          .eq('id', reminder.id);
        if (error) throw error;
        toast({ title: 'Reminder updated successfully' });
      } else {
        const { error } = await supabase
          .from('payment_reminders')
          .insert(data);
        if (error) throw error;
        toast({ title: 'Reminder created successfully' });
      }

      // Try to schedule local notification if enabled
      if (Notification.permission === 'default') {
        await requestNotificationPermission();
      }

      if (Notification.permission === 'granted') {
        schedulePaymentReminder({
          title: data.title,
          amount: data.amount,
          due_date: data.due_date
        });
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {reminder ? 'Edit Payment Reminder' : 'Add Payment Reminder'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Electricity Bill"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notifyBefore">Notify Before (days)</Label>
            <div className="relative mt-1">
              <Bell className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="notifyBefore"
                type="number"
                min="1"
                max="30"
                value={notifyBeforeDays}
                onChange={(e) => setNotifyBeforeDays(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Recurring Payment</span>
            </div>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          <AnimatePresence>
            {isRecurring && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Label htmlFor="interval">Repeat Interval</Label>
                <Select value={recurringInterval} onValueChange={setRecurringInterval}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              className="mt-1"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-accent hover:bg-accent/90">
              {loading ? 'Saving...' : reminder ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
