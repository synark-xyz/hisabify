import { motion } from 'framer-motion';
import { ChartPie, Info, TrendingUp, Share2, Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHealthScore } from '../hooks/useHealthScore';
import { useReferral } from '@/features/referrals/hooks/useReferral';
import { getMilestoneBadge, getScoreColor } from '../utils/healthScoreLogic';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useLanguage, getLanguageLocale } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { shareOrCopy, APP_BASE_URL } from '@/lib/shareUtils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { HealthScoreDetailSheet } from './HealthScoreDetailSheet';

export function HealthScoreCard() {
    const { score, loading } = useHealthScore();
    const { referralCode } = useReferral();
    const { t } = useTranslation();
    const { language } = useLanguage();
    const [shareCopied, setShareCopied] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);

    if (loading) {
        return <Skeleton className="w-full h-[180px] rounded-xl" />;
    }

    if (!score) return null;

    // Circular gauge calculations
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score.total / 100) * circumference;
    const strokeColor = getScoreColor(score.total);

    // Milestone badge and challenge sharing
    const milestoneBadge = getMilestoneBadge(score.total);
    const showChallengeButton = milestoneBadge !== null;

    const handleChallenge = async () => {
        const challengeUrl = referralCode
            ? `${APP_BASE_URL}/auth?challenge=${score.total}&ref=${referralCode}`
            : `${APP_BASE_URL}/auth?challenge=${score.total}`;

        const shareText = `I scored ${score.total}/100 on my Financial Health Score! ${milestoneBadge?.emoji ?? ''} Think you can beat me? Track your finances on Hisabify:`;

        const result = await shareOrCopy(
            { title: `My Financial Health Score: ${score.total}/100`, text: shareText, url: challengeUrl },
            'Challenge link copied!',
        );
        if (result === 'copied') {
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2500);
        }
    };

    return (
        <>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-xl p-4 md:p-5 bg-card shadow-card transition-all"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <ChartPie className="w-5 h-5" style={{ color: strokeColor }} />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground tracking-tight text-sm">{t('healthScore.financialHealth')}</h3>
                        <p className="text-xs text-muted-foreground">{t('healthScore.personalFinanceScore')}</p>
                    </div>
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <button className="focus:outline-none">
                            <Info className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="left" className="w-auto p-3 rounded-xl">
                        <div className="space-y-1.5 min-w-[120px]">
                            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{t('healthScore.breakdown')}</p>
                            <div className="flex justify-between text-xs gap-4">
                                <span>{t('healthScore.budgeting')}</span>
                                <span className="font-mono text-emerald-500">{score.breakdown.budget}</span>
                            </div>
                            <div className="flex justify-between text-xs gap-4">
                                <span>{t('healthScore.savings')}</span>
                                <span className="font-mono text-blue-500">{score.breakdown.savings}</span>
                            </div>
                            <div className="flex justify-between text-xs gap-4">
                                <span>{t('healthScore.activity')}</span>
                                <span className="font-mono text-amber-500">{score.breakdown.activity}</span>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                {/* Gauge — tappable to open detail sheet */}
                <button
                    onClick={() => setDetailOpen(true)}
                    className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="View health score details"
                >
                    <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                        {/* Track */}
                        <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            stroke="currentColor"
                            className="text-muted/20"
                            strokeWidth="8"
                            fill="transparent"
                            strokeLinecap="round"
                        />
                        {/* Progress */}
                        <motion.circle
                            cx="60"
                            cy="60"
                            r={radius}
                            stroke={strokeColor}
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
                        <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5, type: "spring" }}
                            className="text-2xl font-black tracking-tighter"
                        >
                            {new Intl.NumberFormat(getLanguageLocale(language), { maximumFractionDigits: 0 }).format(score.total)}
                        </motion.span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">{t('healthScore.score')}</span>
                    </div>
                </button>

                {/* Info / Tip */}
                <div className="flex-1 space-y-3 w-full">
                    {/* Milestone badge */}
                    {milestoneBadge && (
                        <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{milestoneBadge.emoji}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">{t(`healthScore.badge.${milestoneBadge.key}.name`, milestoneBadge.name)}</p>
                                <p className="text-[9px] text-muted-foreground truncate">{t(`healthScore.badge.${milestoneBadge.key}.description`, milestoneBadge.description)}</p>
                            </div>
                        </div>
                    )}

                    <Popover>
                        <PopoverTrigger asChild>
                            <div className="relative cursor-pointer transition-colors hover:bg-muted/30 active:scale-[0.98] transition-all">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                    {t('healthScore.smartInsight')}
                                </p>
                                <p className="text-sm font-medium text-foreground leading-relaxed">
                                    "{t(score.insightKey, score.insightParams)}"
                                </p>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" className="max-w-[300px] p-4 shadow-lg rounded-xl z-50">
                            <div className="space-y-3">
                                <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                                    <Info className="w-4 h-4 text-accent" />
                                    {t('healthScore.howItWorks')}
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {t('healthScore.scoreCalculated')}
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2 text-xs">
                                        <div className="mt-0.5 p-1 rounded-full bg-emerald-500/20 text-emerald-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-emerald-500">{t('healthScore.budgetControl')}</span>
                                            <p className="text-muted-foreground">{t('healthScore.budgetControlDesc')}</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-2 text-xs">
                                        <div className="mt-0.5 p-1 rounded-full bg-blue-500/20 text-blue-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-blue-500">{t('healthScore.savingsSignals')}</span>
                                            <p className="text-muted-foreground">{t('healthScore.savingsSignalsDesc')}</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-2 text-xs">
                                        <div className="mt-0.5 p-1 rounded-full bg-amber-500/20 text-amber-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-amber-500">{t('healthScore.activityScore')}</span>
                                            <p className="text-muted-foreground">{t('healthScore.activityScoreDesc')}</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Challenge a Friend button — only visible at milestone scores */}
                    {showChallengeButton && (
                        <button
                            className="w-full h-8 rounded-lg text-[10px] text-amber-600 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5 font-bold"
                            onClick={handleChallenge}
                        >
                            {shareCopied ? (
                                <>
                                    <Check className="w-3 h-3" />
                                    {t('healthScore.copied')}
                                </>
                            ) : (
                                <>
                                    <Share2 className="w-3 h-3" />
                                    {t('healthScore.challengeAFriend')}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>

        <HealthScoreDetailSheet open={detailOpen} onOpenChange={setDetailOpen} score={score} />
        </>
    );
}
