import { motion } from 'framer-motion';
import { Utensils, ShoppingBag, HeartPulse, Car, Gamepad2, Receipt, Wallet, CircleDot } from 'lucide-react';
import { Transaction } from '@/types';
import { format } from 'date-fns';
import { useCurrency, currencyData } from '@/hooks/useCurrency';

interface TransactionItemProps {
  transaction: Transaction;
  index?: number;
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

export function TransactionItem({ transaction, index = 0 }: TransactionItemProps) {
  const { currency, formatAmount } = useCurrency();
  
  const Icon = transaction.category?.icon 
    ? iconMap[transaction.category.icon] || CircleDot
    : CircleDot;

  const isIncome = transaction.type === 'income';
  const formattedDate = format(new Date(transaction.date), 'EEE, dd MMM yyyy');

  // Get original currency info
  const originalCurrency = transaction.currency_original;
  const originalAmount = transaction.amount_original;
  const showOriginal = originalCurrency && originalCurrency !== currency && originalAmount;
  const originalSymbol = originalCurrency ? (currencyData[originalCurrency]?.symbol || originalCurrency) : '';

  // Use converted amount for display (falls back to amount for backward compatibility)
  const displayAmount = transaction.amount_converted ?? transaction.amount;

  return (
    <motion.div
      className="flex items-center gap-4 p-4 bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
    >
      <motion.div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${transaction.category?.color}20` }}
        whileHover={{ scale: 1.1, rotate: 5 }}
      >
        <Icon
          className="w-6 h-6"
          style={{ color: transaction.category?.color || 'hsl(var(--muted-foreground))' }}
        />
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{transaction.merchant}</p>
        <p className="text-sm text-muted-foreground">{transaction.category?.name || 'Uncategorized'}</p>
      </div>
      <div className="text-right">
        <motion.p
          className={`font-bold text-lg ${isIncome ? 'text-emerald-500' : 'text-accent'}`}
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
        >
          {isIncome ? '+' : '-'}{formatAmount(Math.abs(displayAmount))}
        </motion.p>
        {/* Show original amount in different currency */}
        {showOriginal && (
          <p className="text-xs text-muted-foreground">
            {originalSymbol}{Math.abs(originalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>
    </motion.div>
  );
}
