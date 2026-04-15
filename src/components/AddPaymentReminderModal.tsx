import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, DollarSign, Bell, RefreshCw, Loader2, ChevronDown, ChevronUp, Receipt, Search, X } from 'lucide-react';
import { BaseModalSheet, SheetBackdrop, SheetContainer, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetFooter, SheetScroller } from '@/components/ui/base-modal-sheet';
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
  reminder?: PaymentReminder;
  initialData?: ReminderInitialData;
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

  const filteredTransactions = transactions.filter(tx => {
    const merchantMatch = tx.merchant.toLowerCase().includes(searchQuery.toLowerCase());
    const categoryName = tx.category?.name?.toLowerCase() ?? '';
    const categoryMatch = categoryName.includes(searchQuery.toLowerCase());
    return merchantMatch || categoryMatch;
  });

  const handleSelectTransaction = (transaction: typeof transactions[0]) => {
    setTitle(transaction.merchant);
    setAmount((transaction.amount_original || transaction.amount).toString());
    const txCurrency = transaction.currency_original || currency;
    setReminderCurrency(txCurrency);
    const txDate = new Date(transaction.date);
    const nextDueDate = addMonths(txDate, 1);
    setDueDate(format(nextDueDate, 'yyyy-MM-dd'));
    const txCurrencySymbol = currencyData[txCurrency]?.symbol || '$';
    const txAmount = (transaction.amount_original || transaction.amount).toFixed(2);
    setNote(`Based on transaction [${txCurrency}]: ${txCurrencySymbol}${txAmount} on ${format(txDate, 'MMM dd, yyyy')}`);
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

      let result;
      if (reminder) {
        result = await supabase.from('payment_reminders').update(data).eq('id', reminder.id);
      } else {
        result = await supabase.from('payment_reminders').insert(data);
      }

      if (result.error) throw result.error;

      await requestNotificationPermission();
      await schedulePaymentReminder({
        id: reminder?.id || result.data?.[0]?.id || '',
        title,
        amount: parseFloat(amount),
        currency: reminderCurrency,
        dueDate: toReminderDueDateIso(dueDate),
        notifyBeforeDays: parseInt(notifyBeforeDays),
        isRecurring,
        recurringInterval: isRecurring ? recurringInterval : undefined,
      });

      toast({ title: reminder ? t('reminders.reminderUpdated') : t('reminders.reminderCreated') });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving reminder:', error);
      toast({ title: t('reminders.reminderSaveFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModalSheet open={open} onOpenChange={onOpenChange}>
      <SheetBackdrop onClick={() => onOpenChange(false)} />
      <SheetContainer>
        <SheetHeader>
          <SheetTitle>{reminder ? t('reminders.editReminder') : t('reminders.createReminder')}</SheetTitle>
          <SheetClose />
        </SheetHeader>
        <SheetContent>
          <SheetScroller>
            <form onSubmit={handleSubmit} className="space-y-5 px-1 pb-4">
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Quick Fill</Label>
                  <button
                    type="button"
                    onClick={() => setShowQuickFill(!showQuickFill)}
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    {showQuickFill ? 'Hide' : 'From Transactions'}
                    {showQuickFill ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                <AnimatePresence>
                  {showQuickFill && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 p-3 bg-muted/30 rounded-2xl border border-border/50">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder={t('reminders.searchTransactions')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 rounded-xl h-10 text-sm"
                          />
                        </div>

                        {loadingTransactions ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {filteredTransactions.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">{t('reminders.noTransactionsFound')}</p>
                            ) : (
                              filteredTransactions.slice(0, 10).map((tx) => (
                                <button
                                  key={tx.id}
                                  type="button"
                                  onClick={() => handleSelectTransaction(tx)}
                                  className={cn(
                                    "w-full flex items-center gap-2 p-2 rounded-xl hover:bg-background transition-colors text-left",
                                    selectedTransactionId === tx.id && "bg-accent/10 ring-1 ring-accent"
                                  )}
                                >
                                  <Receipt className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{tx.merchant}</p>
                                    <p className="text-xs text-muted-foreground truncate">{getLocalizedCategoryName(tx.category)}</p>
                                  </div>
                                  <span className="text-sm font-bold flex-shrink-0">
                                    {currencyData[tx.currency_original || currency]?.symbol || '$'}{(tx.amount_original || tx.amount).toFixed(2)}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                    <Label className="text-sm font-bold cursor-pointer">{t('reminders.reminderRecurringPayment')}</Label>
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
            </form>
          </SheetScroller>
          <SheetFooter>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="flex-1 text-muted-foreground rounded-2xl h-12"
              >
                Cancel
              </Button>
              <Button type="submit" onClick={handleSubmit} disabled={loading} className="flex-1 h-12">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : reminder ? 'Update Reminder' : 'Create Reminder'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </SheetContainer>
    </BaseModalSheet>
  );
}
