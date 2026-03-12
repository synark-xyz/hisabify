import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  ForkKnife,
  ShoppingBag,
  Heartbeat,
  Car,
  GameController,
  Receipt,
  Wallet,
  Circle,
  PencilSimple,
  Trash,
  Handshake,
  Bank,
  Buildings,
  CreditCard,
  User,
} from '@phosphor-icons/react';
import { Transaction } from '@/types';
import { format } from 'date-fns';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { getTransactionCategoryName, getTransactionCategoryColor } from '@/lib/transactionUtils';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface TransactionItemProps {
  transaction: Transaction & { convertedAmount?: number };
  index?: number;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  revealedId?: string | null;
  onReveal?: (id: string | null) => void;
}

type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

const iconMap: Record<string, React.ComponentType<{ className?: string, weight?: IconWeight }>> = {
  'utensils': ForkKnife,
  'shopping-bag': ShoppingBag,
  'heart-pulse': Heartbeat,
  'car': Car,
  'gamepad-2': GameController,
  'receipt': Receipt,
  'wallet': Wallet,
  'circle-dot': Circle,
  'bank': Bank,
  'buildings': Buildings,
  'credit_card': CreditCard,
  'user': User,
  'lend': Handshake,
  'owe': Bank,
};

export function TransactionItem({ transaction, index = 0, onEdit, onDelete, revealedId, onReveal }: TransactionItemProps) {
  const { currency, formatAmount } = useCurrency();
  const { variant } = useTheme();

  // Use external control if provided, otherwise use internal state
  const isRevealed = revealedId !== undefined ? revealedId === transaction.id : false;
  const [internalRevealed, setInternalRevealed] = useState(false);
  const actualRevealed = revealedId !== undefined ? isRevealed : internalRevealed;

  const categoryName = getTransactionCategoryName(transaction);
  const categoryColor = getTransactionCategoryColor(transaction);

  // Map category icons or use defaults based on keywords
  const getIcon = () => {
    try {
      if (transaction.category?.icon && iconMap[transaction.category.icon]) {
        return iconMap[transaction.category.icon];
      }

      // Fallback logic for payment types
      // Safe access to note
      const note = (transaction.note || '').toLowerCase();

      if (note.includes('[credit_card]')) return CreditCard;
      if (note.includes('[utility]')) return Buildings;
      if (note.includes('[lend]')) return Handshake;
      if (note.includes('[owe]')) return Bank;

      if (transaction.type === 'lend') return Handshake;
      if (transaction.type === 'owe') return Bank;
      if (transaction.type === 'income') return Wallet;

      return Circle;
    } catch (e) {
      console.warn("Error resolving icon", e);
      return Circle;
    }
  };

  const Icon = getIcon();

  const isIncome = transaction.type === 'income';
  // Additional safety for date parsing
  const dateObj = new Date(transaction.date);
  const formattedDate = !isNaN(dateObj.getTime()) ? format(dateObj, 'MMM d, yyyy') : 'Invalid Date';

  // Get currency info
  const storedBaseCurrency = transaction.currency_base || 'USD';
  const originalCurrency = transaction.currency_original || storedBaseCurrency;
  const originalAmount = transaction.amount_original || transaction.amount;
  const originalSymbol = currencyData[originalCurrency]?.symbol || originalCurrency;

  // Use pre-calculated convertedAmount if available (from ExpensesPage), otherwise fallback to amount
  const displayAmount = typeof transaction.convertedAmount === 'number'
    ? transaction.convertedAmount
    : transaction.amount;

  // Show original amount if user transacted in a different currency than their current base
  const showOriginal = originalCurrency !== currency;

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = -80;
    const closeThreshold = 40;

    if (info.offset.x < threshold) {
      // Swipe left to reveal - ensure only this item is revealed
      if (onReveal) {
        onReveal(transaction.id);
      } else {
        setInternalRevealed(true);
      }
    } else if (info.offset.x > closeThreshold || info.offset.x > 20) {
      // Swipe right or small movement to close
      if (onReveal) {
        onReveal(null);
      } else {
        setInternalRevealed(false);
      }
    } else {
      // Snap back to current state
      // Do nothing - animation will handle it
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
              mass: 0.5
            }}
            className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-2 z-0"
          >
            <motion.button
              onClick={handleEdit}
              className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ delay: 0.05 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <PencilSimple className="w-5 h-5 text-primary" weight="bold" />
            </motion.button>
            <motion.button
              onClick={handleDelete}
              className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trash className="w-5 h-5 text-destructive" weight="bold" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main transaction card - draggable */}
      <motion.div
        className="flex items-center gap-4 p-4 bg-card/60 backdrop-blur-md rounded-2xl border border-border/50 shadow-card hover:shadow-card-hover transition-all relative z-10 cursor-grab active:cursor-grabbing card-3d"
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          x: actualRevealed ? -120 : 0
        }}
        transition={{
          delay: index * 0.05,
          y: { duration: 0.3, ease: 'easeOut' },
          opacity: { duration: 0.3, ease: 'easeOut' },
          x: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8
          }
        }}
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.15}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onClick={() => actualRevealed && (onReveal ? onReveal(null) : setInternalRevealed(false))}
      >
        <motion.div
          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner"
          style={{
            backgroundColor: `${categoryColor}15`,
            border: `1px solid ${categoryColor}30`
          }}
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <Icon
            className="w-6 h-6 icon-glow"
            weight="duotone"
            style={{ color: categoryColor }}
          />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground truncate tracking-tight">{transaction.merchant}</p>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider opacity-70">{categoryName}</p>
        </div>
        <div className="text-right">
          {/* Main amount in user's base currency */}
          <p className={cn(
            "font-black text-lg tracking-tighter text-glow",
            isIncome ? 'text-emerald-500' : 'text-rose-500'
          )}>
            {isIncome ? '+' : '-'}{formatAmount(Math.abs(displayAmount))}
          </p>
          {/* Show original spent amount if different currency */}
          {showOriginal && (
            <p className="text-[10px] font-bold text-muted-foreground/60">
              ≈ {originalSymbol}{Math.abs(originalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
          <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>
      </motion.div>
    </div>
  );
}
