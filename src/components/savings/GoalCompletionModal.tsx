import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { Share2, Check, PartyPopper, Trophy, Star, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { shareOrCopy, APP_BASE_URL } from '@/lib/shareUtils';
import type { SavingsGoalWithProgress } from '@/hooks/useSavingsGoals';
import { useTranslation } from 'react-i18next';

interface GoalCompletionModalProps {
  goal: SavingsGoalWithProgress;
  open: boolean;
  onClose: () => void;
}

type CardTier = 'platinum' | 'gold' | 'silver' | 'bronze';

function getCardTier(amount: number): CardTier {
  if (amount >= 100000) return 'platinum';
  if (amount >= 10000) return 'gold';
  if (amount >= 1000) return 'silver';
  return 'bronze';
}

const TIER_CONFIG: Record<CardTier, {
  gradient: string;
  badgeKey: string;
  badgeColor: string;
  icon: React.ReactNode;
  textColor: string;
  borderColor: string;
}> = {
  platinum: {
    gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    badgeKey: 'savings.tier.platinum',
    badgeColor: 'from-slate-300 via-white to-slate-400',
    icon: <Star className="w-5 h-5" />,
    textColor: 'text-white',
    borderColor: 'border-slate-400/40',
  },
  gold: {
    gradient: 'linear-gradient(135deg, #1a0a00 0%, #3d2200 50%, #1a0a00 100%)',
    badgeKey: 'savings.tier.gold',
    badgeColor: 'from-yellow-300 via-amber-400 to-yellow-500',
    icon: <Trophy className="w-5 h-5" />,
    textColor: 'text-white',
    borderColor: 'border-yellow-400/40',
  },
  silver: {
    gradient: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)',
    badgeKey: 'savings.tier.silver',
    badgeColor: 'from-gray-300 via-slate-400 to-gray-300',
    icon: <Sparkles className="w-5 h-5" />,
    textColor: 'text-white',
    borderColor: 'border-gray-400/40',
  },
  bronze: {
    gradient: 'linear-gradient(135deg, #1a0f00 0%, #3d2600 50%, #1a0f00 100%)',
    badgeKey: 'savings.tier.bronze',
    badgeColor: 'from-orange-400 via-amber-600 to-orange-500',
    icon: <PartyPopper className="w-5 h-5" />,
    textColor: 'text-white',
    borderColor: 'border-orange-400/40',
  },
};

const CONFETTI_COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EC4899', '#60A5FA', '#34D399'];

export function GoalCompletionModal({ goal, open, onClose }: GoalCompletionModalProps) {
  const { formatAmount } = useCurrency();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const tier = getCardTier(goal.current_amount);
  const config = TIER_CONFIG[tier];

  const completionDate = goal.completed_at
    ? new Date(goal.completed_at)
    : goal.updated_at
    ? new Date(goal.updated_at)
    : new Date();

  const timeTaken = differenceInDays(completionDate, new Date(goal.created_at));

  const shareText = `I just hit my "${goal.name}" savings goal on Hisabify! Saved ${formatAmount(goal.current_amount)} in ${timeTaken} days. Track your finances too:`;

  const handleShare = async () => {
    const result = await shareOrCopy(
      { title: `Goal Achieved: ${goal.name}`, text: shareText, url: `${APP_BASE_URL}/` },
    );
    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Reset copy state when modal closes
  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10060] flex items-center justify-center p-4 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Confetti particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none rounded-sm"
              style={{
                width: `${6 + (i % 4) * 3}px`,
                height: `${6 + (i % 3) * 3}px`,
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                left: `${5 + i * 4.5}%`,
                top: '-10px',
              }}
              initial={{ y: -20, opacity: 0, rotate: 0 }}
              animate={{
                y: ['0vh', '110vh'],
                x: [0, (i % 2 === 0 ? 1 : -1) * (20 + (i % 5) * 15)],
                opacity: [0, 1, 1, 0],
                rotate: [0, (i % 2 === 0 ? 360 : -360)],
              }}
              transition={{
                duration: 2.5 + (i % 4) * 0.4,
                ease: 'easeIn',
                delay: i * 0.06,
              }}
            />
          ))}

          {/* Modal card */}
          <motion.div
            className="relative z-10 w-full max-w-sm"
            initial={{ scale: 0.85, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.05 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Achievement card */}
            <div
              className={cn(
                'rounded-3xl overflow-hidden border shadow-2xl',
                config.borderColor,
              )}
              style={{ background: config.gradient }}
            >
              {/* Top glow accent */}
              <div
                className="absolute inset-x-0 top-0 h-32 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, ${goal.color}30 0%, transparent 70%)`,
                }}
              />

              <div className="relative p-6 space-y-5">
                {/* Tier badge */}
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider',
                      `bg-gradient-to-r ${config.badgeColor}`,
                    )}
                    style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                  >
                    <span
                      className={cn('bg-gradient-to-r', config.badgeColor)}
                      style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
                    >
                      {t(config.badgeKey)} {t('savings.achievement')}
                    </span>
                  </div>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${goal.color}25`, color: goal.color }}
                  >
                    {config.icon}
                  </div>
                </div>

                {/* Goal name and amount */}
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', delay: 0.2, stiffness: 260, damping: 18 }}
                  >
                    <div
                      className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: `${goal.color}20` }}
                    >
                      <PartyPopper className="w-8 h-8" style={{ color: goal.color }} />
                    </div>
                  </motion.div>

                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-400">
                    Goal Completed
                  </p>
                  <h2 className="text-2xl font-black text-white leading-tight">{goal.name}</h2>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/[0.06] p-3 text-center border border-white/[0.08]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1">Saved</p>
                    <p className="text-sm font-black text-white">{formatAmount(goal.current_amount)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.06] p-3 text-center border border-white/[0.08]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1">Days</p>
                    <p className="text-sm font-black text-white">{Math.max(timeTaken, 1)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.06] p-3 text-center border border-white/[0.08]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1">Date</p>
                    <p className="text-sm font-black text-white">{format(completionDate, 'MMM d')}</p>
                  </div>
                </div>

                {/* Branding watermark */}
                <div className="text-center">
                  <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]">
                    hisabify.app
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 space-y-2">
              <Button
                className="w-full h-12 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 shadow-lg shadow-emerald-500/20"
                onClick={handleShare}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied to clipboard!
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Your Win
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full h-10 rounded-2xl font-bold text-sm text-white/50 hover:text-white/80"
                onClick={onClose}
              >
                Celebrate Later
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
