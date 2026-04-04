import { motion } from 'framer-motion';
import { Utensils, ShoppingBag, HeartPulse, Car, Gamepad2, Receipt, Wallet, CircleDot, MoreVertical, Edit, Trash2, Bookmark, CreditCard, ArrowUpRight, HandCoins } from 'lucide-react';
import { BudgetSpendingChart } from '@/components/BudgetSpendingChart';
import { BudgetWithSpending } from '@/hooks/useBudgets';
import { useCurrency } from '@/hooks/useCurrency';
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
  onViewTransactions?: (budget: BudgetWithSpending) => void;
  onViewInExpenses?: (budget: BudgetWithSpending) => void;
  onPayNow?: (budget: BudgetWithSpending) => void;
  onSaveAsTemplate?: (budgetId: string) => void;
  onMoveLeftoverToSavings?: (budget: BudgetWithSpending) => void;
  savingsReserved?: number;
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

type BudgetStatus = 'safe' | 'warning' | 'utilized' | 'exceeded';

const getStatusColor = (status: BudgetStatus): string => {
  switch (status) {
    case 'exceeded':
      return 'hsl(var(--destructive))';
    case 'warning':
      return 'hsl(45, 93%, 47%)';
    default:
      return 'hsl(142, 76%, 36%)'; // green for safe + utilized
  }
};

const getStatusBgColor = (status: BudgetStatus): string => {
  switch (status) {
    case 'exceeded':
      return 'bg-destructive/10';
    case 'warning':
      return 'bg-yellow-500/10';
    default:
      return 'bg-green-500/10';
  }
};

const getStatusLabel = (status: BudgetStatus): string => {
  switch (status) {
    case 'exceeded': return 'Exceeded';
    case 'warning':  return 'At Risk';
    case 'utilized': return 'Paid';
    default:         return 'On Track';
  }
};

export function BudgetProgressCard({ budget, onEdit, onDelete, onViewTransactions, onViewInExpenses, onPayNow, onSaveAsTemplate, onMoveLeftoverToSavings, savingsReserved = 0 }: BudgetProgressCardProps) {
  const { formatAmount } = useCurrency();

  const Icon = budget.category?.icon
    ? iconMap[budget.category.icon] || CircleDot
    : Wallet;

  const isUpcoming = !!(budget.start_date && new Date(budget.start_date) > new Date());
  const displayPercentage = Math.min(budget.percentage, 100);
  const statusColor = isUpcoming ? 'hsl(var(--muted-foreground))' : getStatusColor(budget.status);
  const periodLabel = budget.period_type.charAt(0).toUpperCase() + budget.period_type.slice(1);

  return (
    <motion.div
      className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
    >
      {/* Clickable body */}
      <button
        type="button"
        className="w-full text-left p-4 focus:outline-none"
        onClick={() => onViewTransactions?.(budget)}
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
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground">
                  {budget.category?.name || budget.name || 'Total Budget'}
                </p>
                {budget.is_recurring && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    Auto-renew
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {periodLabel} • {budget.start_date && format(new Date(budget.start_date), 'MMM d')}
                {budget.end_date
                  ? ` – ${format(new Date(budget.end_date), 'MMM d, yyyy')}`
                  : ' – Ongoing'}
              </p>
            </div>
          </div>

          {/* Dropdown — stop propagation so clicking it doesn't open the sheet */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {onViewInExpenses && (
                  <DropdownMenuItem onClick={() => onViewInExpenses(budget)}>
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    View in Transactions
                  </DropdownMenuItem>
                )}

                {onPayNow && (
                  <DropdownMenuItem onClick={() => onPayNow(budget)}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </DropdownMenuItem>
                )}

                {onMoveLeftoverToSavings && budget.remaining > 0 && (
                  <DropdownMenuItem onClick={() => onMoveLeftoverToSavings(budget)}>
                    <HandCoins className="mr-2 h-4 w-4" />
                    Move Leftover to Savings
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => onEdit(budget)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>

                {onSaveAsTemplate && (
                  <DropdownMenuItem onClick={() => onSaveAsTemplate(budget.id)}>
                    <Bookmark className="mr-2 h-4 w-4" />
                    Save as Template
                  </DropdownMenuItem>
                )}

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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Spent</p>
            <p className="font-bold text-foreground">
              {formatAmount(budget.spent)}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Budget</p>
            <p className="font-semibold text-foreground">
              {formatAmount(budget.amount)}
            </p>
          </div>
          <div className={cn("text-center p-2 rounded-lg", isUpcoming ? 'bg-muted/50' : getStatusBgColor(budget.status))}>
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p className="font-bold" style={{ color: statusColor }}>
              {formatAmount(budget.remaining)}
            </p>
          </div>
        </div>

        {savingsReserved > 0 && (
          <div className="mb-4 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Savings Reserved</span>
              <span className="font-semibold text-foreground">
                {formatAmount(savingsReserved)}
              </span>
            </div>
          </div>
        )}

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
              {isUpcoming
                ? `Starts ${format(new Date(budget.start_date!), 'MMM d')}`
                : budget.percentage > 100
                  ? 'Over budget!'
                  : budget.status === 'utilized'
                    ? '100% utilized'
                    : `${displayPercentage.toFixed(0)}% used`}
            </span>
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                isUpcoming ? 'bg-muted/60' : getStatusBgColor(budget.status)
              )}
              style={{ color: statusColor }}
            >
              {isUpcoming ? 'Upcoming' : getStatusLabel(budget.status)}
            </span>
          </div>
        </div>

        {/* Spending chart — daily bars + cumulative line */}
        <BudgetSpendingChart budget={budget} />
      </button>
    </motion.div>
  );
}
