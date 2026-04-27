import { useNavigate } from 'react-router-dom';
import { Handshake, ArrowRight, AlertCircle, Plus } from 'lucide-react';
import { useDebts } from '@/hooks/useDebts';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { isPast } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useLanguage, getLanguageLocale } from '@/hooks/useLanguage';

export function DebtTriageWidget() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const formatNumber = (n: number) => new Intl.NumberFormat(getLanguageLocale(language)).format(n);
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { outstandingDebts, iOwe, theyOwe, totalIOwe, totalTheyOwe, loading } = useDebts();

  if (loading) return null;

  // Empty state
  if (outstandingDebts.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-3xl px-4 py-3 shadow-card flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
            <Handshake className="w-4 h-4 text-accent" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">{t('debt.noDebtsTracked')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/debts')}
          className="flex items-center gap-1.5 text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-xl hover:bg-accent/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('debt.trackADebt')}
        </button>
      </div>
    );
  }

  const overduePeople = outstandingDebts.filter(
    (d) => d.due_date && isPast(new Date(d.due_date))
  );

  // Combine overdue first, then ok, max 6 pills
  const allPills = [...outstandingDebts].sort((a, b) => {
    const aOverdue = a.due_date && isPast(new Date(a.due_date)) ? 0 : 1;
    const bOverdue = b.due_date && isPast(new Date(b.due_date)) ? 0 : 1;
    return aOverdue - bOverdue;
  }).slice(0, 6);
  const extraCount = outstandingDebts.length - allPills.length;

  return (
    <div className="bg-card border border-border/50 rounded-xl shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Handshake className="w-4 h-4 text-accent" />
          </div>
          <span className="text-sm font-black tracking-tight">{t('debt.debts')}</span>
          <span className="text-xs text-muted-foreground">{t('debt.activeCount', { count: formatNumber(outstandingDebts.length) })}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/debts')}
          className="flex items-center gap-1 text-xs font-bold text-accent hover:text-accent/80 transition-colors"
        >
          {t('debt.manageAll')}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Two lanes */}
      <div className="grid grid-cols-2 gap-2.5 px-4 py-3">
        {/* To Pay */}
        <div className="bg-card border border-border/50 rounded-xl p-3 relative">
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">{t('debt.toPay')}</span>
          </div>
          <p className="text-xl font-black text-rose-500 leading-none mb-0.5 mt-4">
            {formatAmount(totalIOwe)}
          </p>
          <p className="text-[10px] text-muted-foreground mb-2.5">{formatNumber(iOwe.length)} {t('debt.debt')}</p>
          <button
            type="button"
            onClick={() => navigate('/debts?tab=i_owe')}
            className="w-full py-1.5 rounded-lg text-rose-500 text-[11px] font-bold hover:bg-rose-500/10 transition-colors"
          >
            {t('debt.payNow')}
          </button>
        </div>

        {/* To Collect */}
        <div className="bg-card border border-border/50 rounded-xl p-3 relative">
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{t('debt.toCollect')}</span>
          </div>
          <p className="text-xl font-black text-emerald-500 leading-none mb-0.5 mt-4">
            {formatAmount(totalTheyOwe)}
          </p>
          <p className="text-[10px] text-muted-foreground mb-2.5">{formatNumber(theyOwe.length)} {t('debt.debt')}</p>
          <button
            type="button"
            onClick={() => navigate('/debts?tab=they_owe')}
            className="w-full py-1.5 rounded-lg text-emerald-500 text-[11px] font-bold hover:bg-emerald-500/10 transition-colors"
          >
            {t('debt.remind')}
          </button>
        </div>
      </div>

      {/* Urgency strip */}
      <div className="px-4 pb-3 border-t border-border/50">
        <div className="flex items-center gap-2 pt-2.5">
          {overduePeople.length > 0 && (
            <div className="flex items-center gap-1 mr-1 shrink-0">
              <AlertCircle className="w-3 h-3 text-rose-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">{t('debt.overdue')}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {allPills.map((d) => {
              const isOverdue = d.due_date && isPast(new Date(d.due_date));
              return (
                <div
                  key={d.id}
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border',
                    isOverdue
                      ? 'text-rose-400 border-rose-500/40'
                      : 'text-muted-foreground border-border/50'
                  )}
                  title={d.person_name}
                >
                  {d.person_name.charAt(0).toUpperCase()}
                </div>
              );
            })}
            {extraCount > 0 && (
              <span className="text-[10px] text-muted-foreground font-bold">+{extraCount}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
