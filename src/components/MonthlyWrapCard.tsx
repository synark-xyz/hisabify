import { useState } from 'react';
import { format } from 'date-fns';
import { Share2, Check, TrendingDown, Flame, Calendar, HandCoins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { shareOrCopy, APP_BASE_URL } from '@/lib/shareUtils';

export interface MonthlyWrapCardProps {
  month: number;
  year: number;
  totalSaved: number;
  budgetWeeksUnder: number;
  expenseStreak: number;
  currency: string;
  formattedTotalSaved: string;
  formattedTotalExpenses: string;
  formattedTotalIncome: string;
  className?: string;
}

export function MonthlyWrapCard({
  month,
  year,
  totalSaved,
  budgetWeeksUnder,
  expenseStreak,
  currency,
  formattedTotalSaved,
  formattedTotalExpenses,
  formattedTotalIncome,
  className,
}: MonthlyWrapCardProps) {
  const [copied, setCopied] = useState(false);

  const monthDate = new Date(year, month - 1, 1);
  const monthLabel = format(monthDate, 'MMMM yyyy');

  const shareText = [
    `My ${monthLabel} money recap on Hisabify:`,
    `Saved: ${formattedTotalSaved}`,
    `Spent: ${formattedTotalExpenses}`,
    `Income: ${formattedTotalIncome}`,
    budgetWeeksUnder > 0 ? `Stayed under budget ${budgetWeeksUnder} week${budgetWeeksUnder !== 1 ? 's' : ''}` : null,
    expenseStreak > 1 ? `${expenseStreak}-day tracking streak` : null,
    `Track yours at ${APP_BASE_URL}`,
  ]
    .filter(Boolean)
    .join('\n');

  const handleShare = async () => {
    const result = await shareOrCopy(
      { title: `My ${monthLabel} Money Recap`, text: shareText, url: `${APP_BASE_URL}/` },
      'Recap copied to clipboard!',
    );
    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isSaving = totalSaved > 0;

  return (
    <div
      className={cn(
        'relative rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl',
        className,
      )}
      style={{
        background: 'linear-gradient(145deg, #0d0d1a 0%, #111827 50%, #0a0f1e 100%)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.15) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(16,185,129,0.10) 0%, transparent 50%)',
        }}
      />

      <div className="relative p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-400 mb-1">
              Monthly Recap
            </p>
            <h2 className="text-xl font-black text-white">{monthLabel}</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08]">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{currency}</span>
          </div>
        </div>

        {/* Main stat — savings */}
        <div className="rounded-2xl bg-white/[0.05] border border-white/[0.07] p-4">
          <div className="flex items-center gap-2 mb-2">
            <HandCoins className="w-4 h-4 text-emerald-400" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              {isSaving ? 'Net Saved' : 'Net Spent'}
            </p>
          </div>
          <p
            className={cn(
              'text-3xl font-black leading-none',
              isSaving ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {formattedTotalSaved}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/[0.05] border border-white/[0.07] p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Spent</p>
            </div>
            <p className="text-sm font-black text-white">{formattedTotalExpenses}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.05] border border-white/[0.07] p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-sky-400 rotate-180" />
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">Earned</p>
            </div>
            <p className="text-sm font-black text-white">{formattedTotalIncome}</p>
          </div>
        </div>

        {/* Achievement badges */}
        {(budgetWeeksUnder > 0 || expenseStreak > 1) && (
          <div className="flex flex-wrap gap-2">
            {budgetWeeksUnder > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
                <span className="text-emerald-400 text-xs">Under budget</span>
                <span className="text-xs font-black text-emerald-300">{budgetWeeksUnder}x</span>
              </div>
            )}
            {expenseStreak > 1 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-1.5">
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-[11px] font-bold text-orange-300">{expenseStreak}-day streak</span>
              </div>
            )}
          </div>
        )}

        {/* Branding */}
        <div className="text-center pt-1">
          <p className="text-[10px] text-white/15 font-bold uppercase tracking-[0.2em]">
            hisabify.app
          </p>
        </div>
      </div>

      {/* Share button — rendered outside the card visually */}
      <div className="px-6 pb-6">
        <Button
          className="w-full h-11 rounded-2xl font-black text-sm bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/20"
          onClick={handleShare}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Share2 className="mr-2 h-4 w-4" />
              Share This Month
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
