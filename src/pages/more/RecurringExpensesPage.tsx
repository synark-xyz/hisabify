import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { format } from 'date-fns';
import { Plus, Repeat, Trash2, Pause, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { useCategories } from '@/hooks/useCategories';
import { DataErrorState } from '@/components/ErrorState';
import { useCurrency } from '@/hooks/useCurrency';
import { RecurringExpense, RecurringFrequency } from '@/types';
import { cn } from '@/lib/utils';

const FREQUENCIES: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

export function RecurringExpensesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currency, formatAmount } = useCurrency();
  const { categories } = useCategories();
  const {
    recurringExpenses, loading, error, refetch,
    createRecurringExpense, updateRecurringExpense, deleteRecurringExpense,
  } = useRecurringExpenses();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [nextDue, setNextDue] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState<string>('none');

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setFrequency('monthly');
    setNextDue(format(new Date(), 'yyyy-MM-dd'));
    setCategoryId('none');
  };

  const parsedAmount = Number.parseFloat(amount);
  const canSave = title.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const ok = await createRecurringExpense({
      title: title.trim(),
      amount: parsedAmount,
      // Templates are always created in the user's base currency: the materialiser runs in
      // Postgres, where no exchange rate is available to convert with.
      currency,
      frequency,
      next_due_date: new Date(`${nextDue}T00:00:00`).toISOString(),
      category_id: categoryId === 'none' ? null : categoryId,
    });
    setSaving(false);
    if (ok) {
      resetForm();
      setOpen(false);
    }
  };

  const toggleActive = (item: RecurringExpense) =>
    updateRecurringExpense(item.id, { is_active: !item.is_active });

  return (
    <PageShell title="recurring.title" backTo="/more" withBottomNav className="px-0 py-0">

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5" />
            {t('recurring.title')}
          </h2>
          <Button size="sm" className="rounded-xl gap-1.5 shrink-0" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('recurring.addRecurring')}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">{t('recurring.description')}</p>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</p>
        ) : error ? (
          <DataErrorState error={error} onRetry={refetch} />
        ) : recurringExpenses.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Repeat className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t('recurring.noRecurring')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recurringExpenses.map((item) => (
              <Card key={item.id} className={cn(!item.is_active && 'opacity-60')}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Repeat className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAmount(item.amount)} · {t(`recurring.${item.frequency}`)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.is_active
                        ? t('recurring.nextOn', { date: format(new Date(item.next_due_date), 'MMM d, yyyy') })
                        : t('recurring.paused')}
                    </p>
                  </div>

                  <Button
                    variant="ghost" size="icon"
                    onClick={() => void toggleActive(item)}
                    aria-label={item.is_active ? t('recurring.pause') : t('recurring.resume')}
                  >
                    {item.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => void deleteRecurringExpense(item.id)}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('recurring.addRecurring')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recurring-title">{t('recurring.name')}</Label>
              <Input
                id="recurring-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('recurring.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurring-amount">{t('transaction.amount')}</Label>
              <Input
                id="recurring-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('recurring.frequency')}</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>{t(`recurring.${f}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurring-next">{t('recurring.startsOn')}</Label>
              <Input
                id="recurring-next"
                type="date"
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('transaction.category')}</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('recurring.noCategory')}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => void handleSave()} disabled={!canSave || saving}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
