import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Bell,
} from '@phosphor-icons/react';
import { Transaction, Category } from '@/types';
import { format } from 'date-fns';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { getTransactionCategoryName, getTransactionCategoryColor } from '@/lib/transactionUtils';
import { cn, getLocalizedCategoryName } from '@/lib/utils';
import { localizeNumber } from '@/lib/i18nNumber';

interface TransactionItemProps {
  transaction: Transaction & { convertedAmount?: number };
  index?: number;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  onAddReminder?: (transaction: Transaction) => void;
  onViewDetails?: (transaction: Transaction) => void;
  revealedId?: string | null;
  onReveal?: (id: string | null) => void;
  categoriesMap?: Map<string, Category>;
}

type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

/** Press-and-hold duration that reveals the row actions. */
const LONG_PRESS_MS = 500;
/** Finger travel that cancels a pending long press — anything more is a scroll. */
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

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

export function TransactionItem({ transaction, index = 0, onEdit, onDelete, onAddReminder, onViewDetails, revealedId, onReveal, categoriesMap }: TransactionItemProps) {
  const { currency, formatAmount } = useCurrency();

  // Use external control if provided, otherwise use internal state
  const isRevealed = revealedId !== undefined ? revealedId === transaction.id : false;
  const [internalRevealed, setInternalRevealed] = useState(false);
  const actualRevealed = revealedId !== undefined ? isRevealed : internalRevealed;

  const categoryName = getTransactionCategoryName(transaction);
  const categoryColor = getTransactionCategoryColor(transaction);

  // Resolve parent category name for sub-category display
  const parentCategoryName = (() => {
    const parentId = transaction.category?.parent_id;
    if (!parentId || !categoriesMap) return null;
    const parent = categoriesMap.get(parentId);
    return parent ? getLocalizedCategoryName(parent) : null;
  })();

  const displayCategoryLabel = parentCategoryName
    ? `${parentCategoryName} › ${categoryName}`
    : categoryName;

  // Parse payer/payee/splitWith from note
  const noteMeta = (() => {
    const n = transaction.note || '';
    const payerMatch = n.match(/\[payer:([^\]]+)\]/);
    const payeeMatch = n.match(/\[payee:([^\]]+)\]/);
    const splitMatch = n.match(/\[split_with:([^\]]+)\]/);
    return {
      payer: payerMatch?.[1] ?? null,
      payee: payeeMatch?.[1] ?? null,
      splitWith: splitMatch?.[1] ?? null,
    };
  })();

  // Tags display — limit to first 3 + overflow chip
  const tags = transaction.tags ?? [];
  const visibleTags = tags.slice(0, 3);
  const overflowCount = tags.length - visibleTags.length;

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

  const setRevealed = useCallback((revealed: boolean) => {
    if (onReveal) onReveal(revealed ? transaction.id : null);
    else setInternalRevealed(revealed);
  }, [onReveal, transaction.id]);

  // Long press reveals the row actions. Only rows that actually have actions arm it.
  const hasActions = !!onEdit || !!onDelete;
  const containerRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const didLongPress = useRef(false);

  const cancelPress = useCallback(() => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }, []);

  useEffect(() => cancelPress, [cancelPress]);

  // A revealed row is dismissed by a scroll or by a press anywhere outside it.
  // Pressing another row also long-presses it, and `revealedId` keeps one row at a time.
  useEffect(() => {
    if (!actualRevealed) return;
    const dismiss = (e: Event) => {
      if (e.target instanceof Node && containerRef.current?.contains(e.target)) return;
      setRevealed(false);
    };
    window.addEventListener('scroll', dismiss, { capture: true, passive: true });
    window.addEventListener('pointerdown', dismiss, true);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('pointerdown', dismiss, true);
    };
  }, [actualRevealed, setRevealed]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!hasActions || e.button !== 0) return;
    didLongPress.current = false;
    pressOrigin.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      didLongPress.current = true;
      setRevealed(true);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const origin = pressOrigin.current;
    if (!origin || pressTimer.current === null) return;
    if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > LONG_PRESS_MOVE_TOLERANCE_PX) {
      cancelPress();
    }
  };

  const handleClick = () => {
    // The click that follows a long press must not also open the details page.
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (actualRevealed) setRevealed(false);
    else onViewDetails?.(transaction);
  };

  const handleEdit = () => {
    setRevealed(false);
    onEdit?.(transaction);
  };

  const handleDelete = () => {
    setRevealed(false);
    onDelete?.(transaction);
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
      {/* Action buttons revealed on long press */}
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
              type="button"
              aria-label="Edit transaction"
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
              type="button"
              aria-label="Delete transaction"
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
        className="flex items-center gap-4 p-4 bg-card/60 backdrop-blur-md rounded-2xl border border-border/50 shadow-card hover:shadow-card-hover transition-all relative z-10 cursor-pointer touch-pan-y select-none card-3d"
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
        style={{ WebkitTouchCallout: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleClick}
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider opacity-70">{displayCategoryLabel}</p>
          {(visibleTags.length > 0 || noteMeta.payer || noteMeta.payee || noteMeta.splitWith) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {noteMeta.payer && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                  Payer: {noteMeta.payer}
                </span>
              )}
              {noteMeta.payee && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                  Payee: {noteMeta.payee}
                </span>
              )}
              {noteMeta.splitWith && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-medium">
                  Split: {noteMeta.splitWith}
                </span>
              )}
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent/80 font-medium"
                >
                  {tag}
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent/80 font-medium">
                  +{localizeNumber(overflowCount)}
                </span>
              )}
            </div>
          )}
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
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            <p className="text-[10px] font-medium text-muted-foreground">{formattedDate}</p>
            {onAddReminder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddReminder(transaction);
                }}
                className="text-muted-foreground/50 hover:text-accent transition-colors"
                aria-label="Add reminder"
              >
                <Bell className="w-3.5 h-3.5" weight="regular" />
              </button>
            )}
          </div>
          {transaction.status === 'uncleared' && (
            <div className="flex justify-end mt-0.5">
              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold uppercase tracking-wider">
                Uncleared
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
