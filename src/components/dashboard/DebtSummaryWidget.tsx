import { useNavigate } from 'react-router-dom';
import { ArrowRight, Handshake, CircleDollarSign } from 'lucide-react';
import { useDebts } from '@/hooks/useDebts';
import { cn } from '@/lib/utils';

export function DebtSummaryWidget() {
  const navigate = useNavigate();
  const { outstandingDebts, totalIOwe, totalTheyOwe, loading } = useDebts();

  if (loading) return null;
  if (outstandingDebts.length === 0) return null;

  const netBalance = totalTheyOwe - totalIOwe;

  return (
    <button
      type="button"
      onClick={() => navigate('/debts')}
      className="w-full bg-card border border-border/50 rounded-3xl p-4 shadow-card text-left hover:border-accent/30 transition-all active:scale-[0.99]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
            <Handshake className="w-4 h-4 text-accent" />
          </div>
          <h3 className="text-sm font-black tracking-tight">Debts</h3>
          <span className="text-xs text-muted-foreground">
            {outstandingDebts.length} outstanding
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={cn(
          'rounded-2xl p-3',
          totalIOwe > 0 ? 'bg-rose-500/10' : 'bg-muted/50'
        )}>
          <div className="flex items-center gap-1.5 mb-1">
            <CircleDollarSign className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">I Owe</span>
          </div>
          <p className={cn('text-lg font-black', totalIOwe > 0 ? 'text-rose-500' : 'text-muted-foreground')}>
            {totalIOwe.toFixed(2)}
          </p>
        </div>
        <div className={cn(
          'rounded-2xl p-3',
          totalTheyOwe > 0 ? 'bg-emerald-500/10' : 'bg-muted/50'
        )}>
          <div className="flex items-center gap-1.5 mb-1">
            <Handshake className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Owed to Me</span>
          </div>
          <p className={cn('text-lg font-black', totalTheyOwe > 0 ? 'text-emerald-500' : 'text-muted-foreground')}>
            {totalTheyOwe.toFixed(2)}
          </p>
        </div>
      </div>

      {netBalance !== 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">Net position</span>
          <span className={cn(
            'text-sm font-black',
            netBalance > 0 ? 'text-emerald-500' : 'text-rose-500'
          )}>
            {netBalance > 0 ? '+' : ''}{netBalance.toFixed(2)}
          </span>
        </div>
      )}
    </button>
  );
}
