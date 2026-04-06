import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, DollarSign, Bell, RefreshCw, Loader2, ChevronDown, ChevronUp, Receipt, Search, X } from 'lucide-react';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { schedulePaymentReminder, requestNotificationPermission } from '@/lib/notifications';
import { toReminderDateInputValue, toReminderDueDateIso } from '@/lib/reminderDate';
import { useTransactionsForReminders } from '@/hooks/useTransactionsForReminders';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { PaymentReminder } from '@/types';
import { format, addMonths } from 'date-fns';
import { cn, getLocalizedCategoryName } from '@/lib/utils';

interface ReminderInitialData {
  title?: string;
  amount?: number;
  currency?: string;
}

interface AddPaymentReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  reminder?: PaymentReminder; // For editing
  initialData?: ReminderInitialData; // Pre-fill from a transaction
}

export function AddPaymentReminderModal({ open, onOpenChange, onSuccess, reminder, initialData }: AddPaymentReminderModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { currency } = useCurrency();
  const { transactions, loading: loadingTransactions } = useTransactionsForReminders();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [reminderCurrency, setReminderCurrency] = useState('USD');
  const [dueDate, setDueDate] = useState('');
  const [notifyBeforeDays, setNotifyBeforeDays] = useState('3');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<string>('monthly');
  const [note, setNote] = useState('');

  // Quick fill state
  const [showQuickFill, setShowQuickFill] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle('');
    setAmount('');
    setReminderCurrency(currency);
    setDueDate('');
    setNotifyBeforeDays('3');
    setIsRecurring(false);
    setRecurringInterval('monthly');
    setNote('');
    setSearchQuery('');
    setSelectedTransactionId(null);
    setShowQuickFill(false);
  }, [currency]);

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title);
      setAmount(reminder.amount.toString());
      setReminderCurrency(reminder.currency || currency);
      setDueDate(toReminderDateInputValue(reminder.due_date));
      setNotifyBeforeDays(reminder.notify_before_days.toString());
      setIsRecurring(reminder.is_recurring);
      setRecurringInterval(reminder.recurring_interval || 'monthly');
      setNote(reminder.note || '');
    } else {
      resetForm();
      if (initialData) {
        if (initialData.title) setTitle(initialData.title);
        if (initialData.amount !== undefined) setAmount(initialData.amount.toString());
        if (initialData.currency) setReminderCurrency(initialData.currency);
      }
    }
  }, [reminder, initialData, open, currency, resetForm]);

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter(tx => {
    const merchantMatch = tx.merchant.toLowerCase().includes(searchQuery.toLowerCase());
    const categoryName = tx.category?.name?.toLowerCase() ?? '';
    const categoryMatch = categoryName.includes(searchQuery.toLowerCase());
    return merchantMatch || categoryMatch;
  });

  // Auto-fill form from selected transaction
  const handleSelectTransaction = (transaction: typeof transactions[0]) => {
    setTitle(transaction.merchant);
    // Use original amount in original currency, fallback to converted amount
    setAmount((transaction.amount_original || transaction.amount).toString());
    const txCurrency = transaction.currency_original || currency;
    setReminderCurrency(txCurrency);

    // Set due date to 1 month from transaction date (common for monthly bills)
    const txDate = new Date(transaction.date);
    const nextDueDate = addMonths(txDate, 1);
    setDueDate(format(nextDueDate, 'yyyy-MM-dd'));

    // Set note with transaction date and currency reference
    const txCurrencySymbol = currencyData[txCurrency]?.symbol || '$';
    const txAmount = (transaction.amount_original || transaction.amount).toFixed(2);
    setNote(`Based on transaction [${txCurrency}]: ${txCurrencySymbol}${txAmount} on ${format(txDate, 'MMM dd, yyyy')}`);

    // Mark as selected and collapse quick fill
    setSelectedTransactionId(transaction.id);
    setShowQuickFill(false);

    toast({
      title: t('reminders.formAutoFilled'),
      description: t('reminders.formAutoFilledDesc', { merchant: transaction.merchant }),
    });
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
        currency: reminderCurrency,
        due_date: toReminderDueDateIso(dueDate),
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
        toast({ title: t('reminders.reminderUpdated') });
      } else {
        const { error } = await supabase
          .from('payment_reminders')
          .insert(data);
        if (error) throw error;
        toast({ title: t('reminders.reminderCreated') });
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save reminder';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={reminder ? t('reminders.editPaymentReminder') : t('reminders.addPaymentReminder')}
    >
      {/* Quick Fill from Transaction Section */}
      {!reminder && (
        <div className="mb-4 border-b border-border pb-4">
          <button
            type="button"
            onClick={() => setShowQuickFill(!showQuickFill)}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold">{t('reminders.quickFillFromTransaction')}</span>
              {filteredTransactions.length > 0 && (
                <span className="text-xs text-muted-foreground">({filteredTransactions.length})</span>
              )}
            </div>
            {showQuickFill ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          <AnimatePresence>
            {showQuickFill && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('reminders.searchTransactions')}
                      className="pl-9 pr-9 rounded-xl h-10 text-sm"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Transaction List */}
                  {loadingTransactions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      {searchQuery ? t('reminders.noMatchingTransactions') : t('reminders.noRecentTransactions')}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {filteredTransactions.slice(0, 10).map((transaction) => (
                        <motion.button
                          key={transaction.id}
                          type="button"
                          onClick={() => handleSelectTransaction(transaction)}
                          className={cn(
                            'w-full p-3 rounded-xl border text-left transition-all hover:border-accent hover:bg-accent/5',
                            selectedTransactionId === transaction.id
                              ? 'border-accent bg-accent/10'
                              : 'border-border bg-card'
                          )}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm truncate">
                                  {transaction.merchant}
                                </span>
                                {transaction.category && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-md"
                                    style={{
                                      backgroundColor: `${transaction.category.color}20`,
                                      color: transaction.category.color
                                    }}
                                  >
                                    {transaction.category.name}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(transaction.date), 'MMM dd, yyyy')}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm">
                                {currencyData[transaction.currency_original || currency]?.symbol || '$'}
                                {(transaction.amount_original || transaction.amount).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider opacity-70">{t('reminders.reminderTitleLabel')}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('reminders.reminderTitlePlaceholder')}
                required
                className="rounded-xl h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider opacity-70">{t('reminders.reminderAmountLabel')}</Label>
                <div className="grid grid-cols-[1fr_96px] gap-2">
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={t('common.amountPlaceholder')}
                      required
                      className="pl-9 rounded-xl h-12 font-bold"
                    />
                  </div>
                  <Select value={reminderCurrency} onValueChange={setReminderCurrency}>
                    <SelectTrigger className="rounded-xl h-12 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-64">
                      {Object.entries(currencyData).map(([code, info]) => (
                        <SelectItem key={code} value={code} className="rounded-xl">
                          {info.symbol} {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-xs font-bold uppercase tracking-wider opacity-70">{t('reminders.reminderDueDateLabel')}</Label>
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
              <Label htmlFor="notifyBefore" className="text-xs font-bold uppercase tracking-wider opacity-70">{t('reminders.reminderNotifyBeforeLabel')}</Label>
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
                  <Label className="text-sm font-bold">{t('reminders.reminderRecurringPayment')}</Label>
                  <p className="text-xs text-muted-foreground">{t('reminders.reminderRecurringDesc')}</p>
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
                  <Label htmlFor="interval" className="text-xs font-bold uppercase tracking-wider opacity-70">{t('reminders.reminderRepeatInterval')}</Label>
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
    </ResponsiveDrawer>
  );
}
