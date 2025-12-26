import { Utensils, ShoppingBag, HeartPulse, Car, Gamepad2, Receipt, Wallet, CircleDot } from 'lucide-react';
import { Transaction } from '@/types';
import { format } from 'date-fns';

interface TransactionItemProps {
  transaction: Transaction;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'utensils': Utensils,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  'car': Car,
  'gamepad-2': Gamepad2,
  'receipt': Receipt,
  'wallet': Wallet,
  'circle-dot': CircleDot,
};

export function TransactionItem({ transaction }: TransactionItemProps) {
  const Icon = transaction.category?.icon 
    ? iconMap[transaction.category.icon] || CircleDot
    : CircleDot;

  const isIncome = transaction.type === 'income';
  const formattedDate = format(new Date(transaction.date), 'EEE, dd MMM yyyy');

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-card animate-in">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${transaction.category?.color}20` }}
      >
        <Icon
          className="w-6 h-6"
          style={{ color: transaction.category?.color || 'hsl(var(--muted-foreground))' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{transaction.merchant}</p>
        <p className="text-sm text-muted-foreground">{transaction.category?.name || 'Uncategorized'}</p>
      </div>
      <div className="text-right">
        <p className={`font-bold ${isIncome ? 'text-green-500' : 'text-accent'}`}>
          {isIncome ? '+' : '-'}${Math.abs(transaction.amount).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>
    </div>
  );
}
