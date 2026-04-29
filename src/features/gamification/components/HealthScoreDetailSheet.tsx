import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getMilestoneBadge, generateTips, getScoreColor, SCORE_WEIGHTS } from '../utils/healthScoreLogic';
import type { HealthScoreResult } from '../utils/healthScoreLogic';
import { cn } from '@/lib/utils';
import { localizeNumber } from '@/lib/i18nNumber';

interface HealthScoreDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: HealthScoreResult | null;
}

const COMPONENTS = [
  { key: 'budget' as const, labelKey: 'healthScore.budgeting', max: SCORE_WEIGHTS.budget, bg: 'bg-emerald-500' },
  { key: 'savings' as const, labelKey: 'healthScore.savings', max: SCORE_WEIGHTS.savings, bg: 'bg-blue-500' },
  { key: 'activity' as const, labelKey: 'healthScore.activity', max: SCORE_WEIGHTS.activity, bg: 'bg-amber-500' },
];

const TIP_COLORS: Record<string, string> = {
  budget: 'text-emerald-600',
  savings: 'text-blue-600',
  activity: 'text-amber-600',
  general: 'text-accent',
};

export function HealthScoreDetailSheet({ open, onOpenChange, score }: HealthScoreDetailSheetProps) {
  const { t } = useTranslation();
  if (!score) return null;

  const milestoneBadge = getMilestoneBadge(score.total);
  const tips = generateTips(score.breakdown, score.total);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score.total / 100) * circumference;
  const strokeColor = getScoreColor(score.total);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto px-6 pb-8">
        <SheetHeader className="mb-5 pt-2">
          <SheetTitle className="text-left font-bold text-xl">{t('healthScore.detailTitle')}</SheetTitle>
        </SheetHeader>

        {/* Score gauge + badge */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                className="text-muted/20"
                strokeWidth="7"
                fill="transparent"
                strokeLinecap="round"
              />
              <motion.circle
                cx="48"
                cy="48"
                r={radius}
                stroke={strokeColor}
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-3xl font-black tracking-tighter"
                style={{ color: strokeColor }}
              >
                {localizeNumber(score.total)}
              </span>
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">
                / 100
              </span>
            </div>
          </div>

          <div className="flex-1">
            {milestoneBadge ? (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-lg leading-none">{milestoneBadge.emoji}</span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-amber-600">
                    {t(`healthScore.badge.${milestoneBadge.key}.name`, milestoneBadge.name)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t(`healthScore.badge.${milestoneBadge.key}.description`, milestoneBadge.description)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">
                {t('healthScore.earnBadgePrompt')}
              </p>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">{t(score.insightKey, score.insightParams)}</p>
          </div>
        </div>

        {/* Score breakdown bars */}
        <div className="space-y-4 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t('healthScore.scoreBreakdown')}
          </p>
          {COMPONENTS.map(({ key, labelKey, max, bg }) => {
            const val = score.breakdown[key];
            const pct = Math.round((val / max) * 100);
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{t(labelKey)}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {t('healthScore.maxPtsLabel', { max })}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    {localizeNumber(val)}
                    <span className="text-xs text-muted-foreground font-normal">/{localizeNumber(max)}</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', bg)}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Improvement tips */}
        {tips.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t('healthScore.improvementTips')}
            </p>
            {tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50"
              >
                <Lightbulb
                  className={cn('w-4 h-4 mt-0.5 flex-shrink-0', TIP_COLORS[tip.component] ?? 'text-accent')}
                />
                <p className="text-sm text-foreground leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
