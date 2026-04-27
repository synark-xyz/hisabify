import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { BudgetWithSpending } from '@/hooks/useBudgets';
import { useCurrency } from '@/hooks/useCurrency';

interface BudgetStatus {
  hasActiveBudget: boolean;
  budget: BudgetWithSpending | null;
  remaining: number;
  wouldExceed: boolean;
  status: 'safe' | 'warning' | 'exceeded';
  message?: string;
}

interface BudgetStatusCardProps {
  status: BudgetStatus;
}

export function BudgetStatusCard({ status }: BudgetStatusCardProps) {
  const { formatAmount } = useCurrency();
  if (!status.hasActiveBudget || !status.budget) return null;

  const colors = {
    safe: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-300',
    exceeded: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300',
  };

  const iconColors = {
    safe: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    exceeded: 'text-red-600 dark:text-red-400',
  };

  const progressColors = {
    safe: 'bg-green-500',
    warning: 'bg-yellow-500',
    exceeded: 'bg-red-500',
  };

  return (
    <div className={`p-3 rounded-lg border ${colors[status.status]} mb-4`}>
      <div className="flex items-center gap-2">
        {status.status === 'exceeded' && <AlertCircle className={`h-4 w-4 ${iconColors[status.status]}`} />}
        {status.status === 'warning' && <AlertTriangle className={`h-4 w-4 ${iconColors[status.status]}`} />}
        {status.status === 'safe' && <CheckCircle className={`h-4 w-4 ${iconColors[status.status]}`} />}
        <div className="flex-1">
          <p className="text-sm font-medium">
            {status.budget.name || status.budget.category?.name || 'Budget'}
          </p>
          <p className="text-xs">{status.message}</p>
        </div>
      </div>
      {status.budget && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Spent: {formatAmount(status.budget.spent)}</span>
            <span>Limit: {formatAmount(status.budget.amount)}</span>
          </div>
          <div className="w-full px-2"> {/* Extra padding to prevent clipping */}
            <div className="bg-white dark:bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${progressColors[status.status]}`}
                style={{ width: `${Math.min(status.budget.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
