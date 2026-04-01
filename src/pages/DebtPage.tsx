import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Handshake, User, Calendar, ChevronDown, ChevronUp, Trash2, CheckCircle2, CircleDollarSign, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { useDebts } from '@/hooks/useDebts';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { Debt } from '@/types';

function DebtStatusBadge({ status }: { status: Debt['status'] }) {
  const map: Record<Debt['status'], { label: string; className: string }> = {
    outstanding: { label: 'Outstanding', className: 'bg-rose-500/15 text-rose-400' },
    partial: { label: 'Partial', className: 'bg-amber-500/15 text-amber-400' },
    settled: { label: 'Settled', className: 'bg-emerald-500/15 text-emerald-500' },
  };
  const { label, className } = map[status];
  return (
    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', className)}>
      {label}
    </span>
  );
}

interface SettleSheetProps {
  debt: Debt;
  onSettle: (amount: number) => void;
  onClose: () => void;
}
function SettleSheet({ debt, onSettle, onClose }: SettleSheetProps) {
  const remaining = debt.amount - debt.amount_paid;
  const [amount, setAmount] = useState(String(remaining.toFixed(2)));

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        className="relative w-full bg-card rounded-t-3xl p-6 space-y-4 border border-border/50 shadow-2xl"
      >
        <h3 className="text-lg font-bold">Settle Debt</h3>
        <p className="text-sm text-muted-foreground">
          Remaining: <span className="font-bold text-foreground">{debt.currency} {remaining.toFixed(2)}</span>
        </p>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Amount Paid</label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-xl text-lg font-bold"
            placeholder="0.00"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            onClick={() => {
              const val = Number.parseFloat(amount);
              if (val > 0) onSettle(debt.amount_paid + val);
              onClose();
            }}
          >
            Mark Paid
          </Button>
        </div>
        <Button
          variant="ghost"
          className="w-full text-emerald-500 font-bold"
          onClick={() => { onSettle(debt.amount); onClose(); }}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Fully Settled
        </Button>
      </motion.div>
    </div>
  );
}

interface AddDebtSheetProps {
  onAdd: (input: {
    person_name: string;
    amount: number;
    currency: string;
    type: 'i_owe' | 'they_owe';
    due_date?: string | null;
    notes?: string | null;
  }) => void;
  onClose: () => void;
}
function AddDebtSheet({ onAdd, onClose }: AddDebtSheetProps) {
  const { currency } = useCurrency();
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [debtCurrency, setDebtCurrency] = useState(currency);
  const [debtType, setDebtType] = useState<'i_owe' | 'they_owe'>('i_owe');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const canSubmit = personName.trim() && Number.parseFloat(amount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        className="relative w-full bg-card rounded-t-3xl p-6 space-y-4 border border-border/50 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-lg font-bold">Add Debt</h3>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-2">
          {(['i_owe', 'they_owe'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDebtType(t)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all',
                debtType === t ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border bg-card'
              )}
            >
              {t === 'i_owe'
                ? <CircleDollarSign className="w-5 h-5 text-rose-500" />
                : <Handshake className="w-5 h-5 text-emerald-500" />
              }
              <span className="text-xs font-bold">{t === 'i_owe' ? 'I Owe' : 'They Owe Me'}</span>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Person Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="rounded-xl pl-9"
              placeholder="e.g. John, Alice"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Amount</label>
          <div className="flex gap-2">
            <Select value={debtCurrency} onValueChange={setDebtCurrency}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-48">
                {Object.entries(currencyData).map(([code, { symbol }]) => (
                  <SelectItem key={code} value={code} className="rounded-xl">
                    {symbol} {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              className="flex-1 rounded-xl text-lg font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Due Date (Optional)</label>
          <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal rounded-xl">
                <Calendar className="mr-2 h-4 w-4 opacity-50" />
                {dueDate ? format(dueDate, 'MMM dd, yyyy') : 'No due date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
              <CalendarComponent
                mode="single"
                selected={dueDate}
                onSelect={(d) => { setDueDate(d); setDueDateOpen(false); }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70">Notes (Optional)</label>
          <Textarea
            className="rounded-xl resize-none"
            placeholder="Add context..."
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={!canSubmit}
            onClick={() => {
              onAdd({
                person_name: personName.trim(),
                amount: Number.parseFloat(amount),
                currency: debtCurrency,
                type: debtType,
                due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
                notes: notes.trim() || null,
              });
              onClose();
            }}
          >
            Add Debt
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export function DebtPage() {
  const navigate = useNavigate();
  const { debts, loading, totalIOwe, totalTheyOwe, createDebt, settleDebt, deleteDebt } = useDebts();
  const [showAdd, setShowAdd] = useState(false);
  const [settlingDebt, setSettlingDebt] = useState<Debt | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'i_owe' | 'they_owe'>('all');

  const filteredDebts = activeTab === 'all'
    ? debts
    : debts.filter((d) => d.type === activeTab);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black tracking-tight flex-1">Debt Tracker</h1>
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            className="rounded-xl gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-1">I Owe</p>
            <p className="text-2xl font-black text-rose-500">
              {totalIOwe.toFixed(2)}
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">Owed to Me</p>
            <p className="text-2xl font-black text-emerald-500">
              {totalTheyOwe.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Tab filters */}
        <div className="flex gap-2">
          {(['all', 'i_owe', 'they_owe'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 text-xs font-bold py-2 rounded-xl transition-all',
                activeTab === tab
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {tab === 'all' ? 'All' : tab === 'i_owe' ? 'I Owe' : 'Owed to Me'}
            </button>
          ))}
        </div>

        {/* Debt list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredDebts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <Handshake className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">No debts tracked</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Tap + Add to track money owed</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredDebts.map((debt) => {
              const remaining = debt.amount - debt.amount_paid;
              const isOverdue = debt.due_date && isPast(new Date(debt.due_date)) && debt.status !== 'settled';
              const isExpanded = expandedId === debt.id;

              return (
                <motion.div
                  key={debt.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'bg-card border rounded-2xl overflow-hidden transition-all',
                    isOverdue ? 'border-rose-500/30' : 'border-border/50'
                  )}
                >
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 p-4 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : debt.id)}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                      debt.type === 'i_owe' ? 'bg-rose-500/10' : 'bg-emerald-500/10'
                    )}>
                      {debt.type === 'i_owe'
                        ? <CircleDollarSign className="w-5 h-5 text-rose-500" />
                        : <Handshake className="w-5 h-5 text-emerald-500" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold truncate">{debt.person_name}</span>
                        <DebtStatusBadge status={debt.status} />
                        {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {debt.type === 'i_owe' ? 'I owe' : 'Owes me'}
                        </span>
                        <span className="text-sm font-bold">
                          {debt.currency} {remaining.toFixed(2)}
                        </span>
                        {debt.amount_paid > 0 && (
                          <span className="text-xs text-muted-foreground">
                            / {debt.amount.toFixed(2)} total
                          </span>
                        )}
                      </div>
                      {debt.due_date && (
                        <p className={cn('text-xs mt-0.5', isOverdue ? 'text-rose-400' : 'text-muted-foreground')}>
                          <Calendar className="w-3 h-3 inline mr-0.5" />
                          Due {format(new Date(debt.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>

                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                          {debt.notes && (
                            <p className="text-sm text-muted-foreground">{debt.notes}</p>
                          )}

                          {/* Progress bar */}
                          {debt.amount_paid > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Paid: {debt.currency} {debt.amount_paid.toFixed(2)}</span>
                                <span>{Math.round((debt.amount_paid / debt.amount) * 100)}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${Math.min((debt.amount_paid / debt.amount) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            {debt.status !== 'settled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 rounded-xl gap-1.5"
                                onClick={() => setSettlingDebt(debt)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Settle
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteDebt(debt.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Debt Sheet */}
      <AnimatePresence>
        {showAdd && (
          <AddDebtSheet
            onAdd={createDebt}
            onClose={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>

      {/* Settle Debt Sheet */}
      <AnimatePresence>
        {settlingDebt && (
          <SettleSheet
            debt={settlingDebt}
            onSettle={(amount) => settleDebt({ id: settlingDebt.id, amount_paid: amount })}
            onClose={() => setSettlingDebt(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
