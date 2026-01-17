import { motion } from 'framer-motion';
import { Utensils, ShoppingBag, HeartPulse, Car, Gamepad2, Receipt, Wallet, CircleDot, MoreVertical, Edit, Trash2, Copy } from 'lucide-react';
import { BudgetWithSpending } from '@/hooks/useBudgets';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface BudgetProgressCardProps {
  budget: BudgetWithSpending;
  onEdit: (budget: BudgetWithSpending) => void;
  onDelete: (budget: BudgetWithSpending) => void;
  onCopyToNext: (budgetId: string) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'utensils': Utensils,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  'car': Car,
  'gamepad-2': Gamepad2,
  'receipt': Receipt,
  'wallet': Wallet,
  'circle-dot': CircleDot,
};

const getStatusColor = (status: 'safe' | 'warning' | 'exceeded'): string => {
  switch (status) {
    case 'exceeded':
      return 'hsl(var(--destructive))';
    case 'warning':
      return 'hsl(45, 93%, 47%)'; // yellow/amber
    default:
      return 'hsl(142, 76%, 36%)'; // green
  }
};

const getStatusBgColor = (status: 'safe' | 'warning' | 'exceeded'): string => {
  switch (status) {
    case 'exceeded':
      return 'bg-destructive/10';
    case 'warning':
      return 'bg-yellow-500/10';
    default:
      return 'bg-green-500/10';
  }
};

export function BudgetProgressCard({ budget, onEdit, onDelete, onCopyToNext }: BudgetProgressCardProps) {
  const { currency } = useCurrency();
  const currencySymbol = currencyData[currency]?.symbol || '$';
  
  const Icon = budget.category?.icon
    ? iconMap[budget.category.icon] || CircleDot
    : Wallet;

  const displayPercentage = Math.min(budget.percentage, 100);
  const statusColor = getStatusColor(budget.status);
  const periodLabel = budget.period_type.charAt(0).toUpperCase() + budget.period_type.slice(1);

  return (
    <motion.div
      className="bg-card rounded-2xl p-4 shadow-card border border-border/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: budget.category?.color ? `${budget.category.color}20` : 'hsl(var(--muted))' }}
            whileHover={{ rotate: 5, scale: 1.1 }}
          >
            <Icon
              className="w-6 h-6"
              style={{ color: budget.category?.color || 'hsl(var(--primary))' }}
            />
          </motion.div>
          <div>
            <p className="font-bold text-foreground">
              {budget.category?.name || budget.name || 'Total Budget'}
            </p>
            <p className="text-xs text-muted-foreground">
              {periodLabel} • {budget.start_date && format(new Date(budget.start_date), 'MMM d')} - {budget.end_date && format(new Date(budget.end_date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(budget)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyToNext(budget.id)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy to Next Period
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(budget)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Spent</p>
          <p className="font-bold text-foreground">
            {currencySymbol}{budget.spent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground mb-1">Budget</p>
          <p className="font-semibold text-foreground">
            {currencySymbol}{budget.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className={cn("text-center p-2 rounded-lg", getStatusBgColor(budget.status))}>
          <p className="text-xs text-muted-foreground mb-1">Remaining</p>
          <p className="font-bold" style={{ color: statusColor }}>
            {currencySymbol}{budget.remaining.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: statusColor }}
            initial={{ width: 0 }}
            animate={{ width: `${displayPercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        
        {/* Percentage Label */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-muted-foreground">
            {budget.percentage > 100 ? 'Over budget!' : `${displayPercentage.toFixed(0)}% used`}
          </span>
          <span 
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              getStatusBgColor(budget.status)
            )}
            style={{ color: statusColor }}
          >
            {budget.status === 'exceeded' ? 'Exceeded' : budget.status === 'warning' ? 'Warning' : 'On Track'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
