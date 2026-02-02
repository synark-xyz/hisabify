import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, DollarSign, Bell, RefreshCw, Loader2 } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
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
import { cn } from '@/lib/utils';

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
    <Drawer open={open} onOpenChange={onOpenChange} snapPoints={[0.9, 0.6]} activeSnapPoint={0.9}>
      <DrawerContent className="border-none bg-background rounded-t-[32px]">
        <DrawerHeader className="pb-2 flex-shrink-0">
          <DrawerTitle className="text-center font-bold text-xl">
            {reminder ? 'Edit Payment Reminder' : 'Add Payment Reminder'}
          </DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto overflow-x-hidden px-6 pb-6 flex-1">
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider opacity-70">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Electricity Bill"
                required
                className="rounded-xl h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider opacity-70">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="pl-9 rounded-xl h-12 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-xs font-bold uppercase tracking-wider opacity-70">Due Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="pl-9 rounded-xl h-12"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notifyBefore" className="text-xs font-bold uppercase tracking-wider opacity-70">Notify Before (days)</Label>
              <div className="relative">
                <Bell className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="notifyBefore"
                  type="number"
                  min="1"
                  max="30"
                  value={notifyBeforeDays}
                  onChange={(e) => setNotifyBeforeDays(e.target.value)}
                  className="pl-9 rounded-xl h-12"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-xl">
                  <RefreshCw className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <Label className="text-sm font-bold">Recurring Payment</Label>
                  <p className="text-xs text-muted-foreground">Repeat this payment automatically</p>
                </div>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>

            <AnimatePresence>
              {isRecurring && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <Label htmlFor="interval" className="text-xs font-bold uppercase tracking-wider opacity-70">Repeat Interval</Label>
                  <Select value={recurringInterval} onValueChange={setRecurringInterval}>
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="weekly" className="rounded-xl">Weekly</SelectItem>
                      <SelectItem value="monthly" className="rounded-xl">Monthly</SelectItem>
                      <SelectItem value="yearly" className="rounded-xl">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <Label htmlFor="note" className="text-xs font-bold uppercase tracking-wider opacity-70">Note (optional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                className="rounded-xl h-12"
              />
            </div>

            <div className="flex gap-3 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-sm pb-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="flex-1 text-muted-foreground rounded-2xl h-12"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 h-12">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : reminder ? 'Update Reminder' : 'Create Reminder'}
              </Button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
