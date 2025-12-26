import { motion } from 'framer-motion';
import { Utensils, ShoppingBag, HeartPulse, Car, Gamepad2, Receipt, Wallet, CircleDot } from 'lucide-react';
import { Budget } from '@/types';
import { cn } from '@/lib/utils';

interface BudgetCardProps {
  budget: Budget;
  spent: number;
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

export function BudgetCard({ budget, spent }: BudgetCardProps) {
  const percentage = Math.min((spent / budget.amount) * 100, 100);
  const Icon = budget.category?.icon
    ? iconMap[budget.category.icon] || CircleDot
    : CircleDot;

  return (
    <motion.div
      className="bg-card rounded-2xl p-4 shadow-card"
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <motion.div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${budget.category?.color}20` }}
          whileHover={{ rotate: 5, scale: 1.1 }}
        >
          <Icon
            className="w-6 h-6"
            style={{ color: budget.category?.color }}
          />
        </motion.div>
        <div className="flex-1">
          <p className="font-bold text-foreground">{budget.category?.name || 'Other'}</p>
          <p className="text-xs text-muted-foreground">Credit Card</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="flex justify-between text-sm mb-3">
        <div>
          <span className="text-muted-foreground text-xs">Total Spend</span>
          <p className="font-bold text-primary">${spent.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <span className="text-muted-foreground text-xs">Total Budget</span>
          <p className="font-semibold text-foreground">${budget.amount.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <span className="text-muted-foreground text-xs">Used</span>
          <p className={cn(
            'font-bold',
            percentage > 80 ? 'text-destructive' : 'text-primary'
          )}>
            {percentage.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: budget.category?.color || 'hsl(var(--primary))' }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}
