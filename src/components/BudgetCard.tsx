import { Utensils, ShoppingBag, HeartPulse, Car, Gamepad2, Receipt, Wallet, CircleDot } from 'lucide-react';
import { Budget, Category } from '@/types';
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
    <div className="bg-card rounded-xl p-4 shadow-card">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${budget.category?.color}20` }}
        >
          <Icon
            className="w-5 h-5"
            style={{ color: budget.category?.color }}
          />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{budget.category?.name}</p>
          <p className="text-xs text-muted-foreground">Credit Card</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="flex justify-between text-sm mb-2">
        <div>
          <span className="text-muted-foreground">Total Spend</span>
          <span className="ml-2 font-bold text-primary">
            ${spent.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Total Budget</span>
          <span className="ml-2 font-semibold text-foreground">
            ${budget.amount.toLocaleString()}
          </span>
        </div>
        <span className={cn(
          'font-bold',
          percentage > 80 ? 'text-destructive' : 'text-green-500'
        )}>
          {percentage.toFixed(1)}%
        </span>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: budget.category?.color || 'hsl(var(--primary))'
          }}
        />
      </div>
    </div>
  );
}
