import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useHealthScore } from '../hooks/useHealthScore';
import { getMilestoneBadge, generateTips } from '../utils/healthScoreLogic';
import { cn } from '@/lib/utils';

interface HealthScoreDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMPONENTS = [
  { key: 'budget' as const, label: 'Budgeting', max: 35, bg: 'bg-emerald-500' },
  { key: 'savings' as const, label: 'Savings', max: 50, bg: 'bg-blue-500' },
  { key: 'activity' as const, label: 'Activity', max: 15, bg: 'bg-amber-500' },
] as const;

const TIP_COLORS: Record<string, string> = {
  budget: 'text-emerald-600',
  savings: 'text-blue-600',
  activity: 'text-amber-600',
  general: 'text-accent',
};

export function HealthScoreDetailSheet({ open, onOpenChange }: HealthScoreDetailSheetProps) {
  const { score } = useHealthScore();

  if (!score) return null;

  const milestoneBadge = getMilestoneBadge(score.total);
  const tips = generateTips(score.breakdown, score.total);

  const getScoreColor = (val: number) => {
    if (val >= 80) return '#10b981';
    if (val >= 50) return '#f59e0b';
    return '#f43f5e';
  };

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score.total / 100) * circumference;
  const strokeColor = getScoreColor(score.total);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto px-6 pb-8">
        <SheetHeader className="mb-5 pt-2">
          <SheetTitle className="text-left font-bold text-xl">Financial Health Detail</SheetTitle>
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
                {score.total}
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
                    {milestoneBadge.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{milestoneBadge.description}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">
                Keep improving your habits to earn a badge!
              </p>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">{score.insight}</p>
          </div>
        </div>

        {/* Score breakdown bars */}
        <div className="space-y-4 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Score Breakdown
          </p>
          {COMPONENTS.map(({ key, label, max, bg }) => {
            const val = score.breakdown[key];
            const pct = Math.round((val / max) * 100);
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      max {max} pts
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    {val}
                    <span className="text-xs text-muted-foreground font-normal">/{max}</span>
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
              Improvement Tips
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
