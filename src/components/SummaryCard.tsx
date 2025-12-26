import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface SummaryCardProps {
  title: string;
  amount: number;
  cardNumber?: string;
  variant: 'income' | 'expense';
}

export function SummaryCard({ title, amount, cardNumber, variant }: SummaryCardProps) {
  const { formatAmount } = useCurrency();
  
  return (
    <div className={cn(
      'rounded-xl p-4 text-primary-foreground relative overflow-hidden',
      variant === 'income' ? 'card-gradient-purple' : 'card-gradient-green'
    )}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-medium opacity-90">{title}</p>
        <button className="opacity-70 hover:opacity-100 transition-opacity">
          <span className="text-lg">⋮</span>
        </button>
      </div>
      <p className="text-2xl font-bold mb-4">
        {formatAmount(amount)}
      </p>
      {cardNumber && (
        <div className="flex items-center gap-2 text-sm opacity-80">
          <CreditCard className="w-4 h-4" />
          <span>Bank Account</span>
          <span>•••• {cardNumber}</span>
        </div>
      )}
    </div>
  );
}
