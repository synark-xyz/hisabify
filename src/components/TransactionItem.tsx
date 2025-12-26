import { useState, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Utensils, ShoppingBag, HeartPulse, Car, Gamepad2, Receipt, Wallet, CircleDot, Pencil, Trash2 } from 'lucide-react';
import { Transaction } from '@/types';
import { format } from 'date-fns';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useExchangeRateQuery } from '@/hooks/useExchangeRate';

interface TransactionItemProps {
  transaction: Transaction;
  index?: number;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  revealedId?: string | null;
  onReveal?: (id: string | null) => void;
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

export function TransactionItem({ transaction, index = 0, onEdit, onDelete, revealedId, onReveal }: TransactionItemProps) {
  const { currency, formatAmount } = useCurrency();
  
  // Use external control if provided, otherwise use internal state
  const isRevealed = revealedId !== undefined ? revealedId === transaction.id : false;
  const [internalRevealed, setInternalRevealed] = useState(false);
  const actualRevealed = revealedId !== undefined ? isRevealed : internalRevealed;
  
  const Icon = transaction.category?.icon 
    ? iconMap[transaction.category.icon] || CircleDot
    : CircleDot;

  const isIncome = transaction.type === 'income';
  const formattedDate = format(new Date(transaction.date), 'EEE, dd MMM yyyy');

  // Get currency info
  const storedBaseCurrency = transaction.currency_base || 'USD';
  const originalCurrency = transaction.currency_original || storedBaseCurrency;
  const originalAmount = transaction.amount_original || transaction.amount;
  const originalSymbol = currencyData[originalCurrency]?.symbol || originalCurrency;

  // Use React Query for exchange rate with proper caching
  const { data: rateData } = useExchangeRateQuery(storedBaseCurrency, currency);

  // Calculate display amount (converted to user's base currency)
  const displayAmount = useMemo(() => {
    if (currency === storedBaseCurrency) {
      return transaction.amount;
    }
    if (rateData?.rate) {
      return transaction.amount * rateData.rate;
    }
    return transaction.amount;
  }, [currency, storedBaseCurrency, transaction.amount, rateData?.rate]);

  // Show original amount if user transacted in a different currency than their current base
  const showOriginal = originalCurrency !== currency;

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80) {
      if (onReveal) {
        onReveal(transaction.id);
      } else {
        setInternalRevealed(true);
      }
    } else if (info.offset.x > 40) {
      if (onReveal) {
        onReveal(null);
      } else {
        setInternalRevealed(false);
      }
    }
  };

  const handleEdit = () => {
    if (onReveal) onReveal(null);
    else setInternalRevealed(false);
    onEdit?.(transaction);
  };

  const handleDelete = () => {
    if (onReveal) onReveal(null);
    else setInternalRevealed(false);
    onDelete?.(transaction);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Action buttons revealed on swipe */}
      <AnimatePresence>
        {actualRevealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-2 z-0"
          >
            <motion.button
              onClick={handleEdit}
              className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Pencil className="w-5 h-5 text-primary" />
            </motion.button>
            <motion.button
              onClick={handleDelete}
              className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 className="w-5 h-5 text-destructive" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main transaction card - draggable */}
      <motion.div
        className="flex items-center gap-4 p-4 bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-shadow relative z-10 cursor-grab active:cursor-grabbing"
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          x: actualRevealed ? -120 : 0
        }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onClick={() => actualRevealed && (onReveal ? onReveal(null) : setInternalRevealed(false))}
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
          {/* Main amount in user's base currency */}
          <p className={`font-bold text-lg ${isIncome ? 'text-emerald-500' : 'text-accent'}`}>
            {isIncome ? '+' : '-'}{formatAmount(Math.abs(displayAmount))}
          </p>
          {/* Show original spent amount if different currency */}
          {showOriginal && (
            <p className="text-xs text-muted-foreground">
              (~{originalSymbol}{Math.abs(originalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </p>
          )}
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        </div>
      </motion.div>
    </div>
  );
}
