import { motion } from 'framer-motion';
import { ChartPie, Info, Share2, Check, Wallet, HandCoinsIcon, Flame, TrendingUp, Target } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHealthScore } from '../hooks/useHealthScore';
import { useReferral } from '@/features/referrals/hooks/useReferral';
import { getMilestoneBadge, getScoreColor, SCORE_WEIGHTS } from '../utils/healthScoreLogic';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage, getLanguageLocale } from '@/hooks/useLanguage';
import { shareOrCopy, APP_BASE_URL } from '@/lib/shareUtils';
import { MiniDonut } from './MiniDonut';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export function HealthScoreCard() {
    const { score, loading } = useHealthScore();
    const { referralCode } = useReferral();
    const { t } = useTranslation();
    const { language } = useLanguage();
    const [shareCopied, setShareCopied] = useState(false);

    if (loading) {
        return <Skeleton className="w-full h-[180px] rounded-xl" />;
    }

    if (!score) return null;

    // Circular gauge calculations for main score
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

    // Map new 5-component structure to display items
    const miniScoreItems = [
        {
            label: t('healthScore.budgetLabel'),
            value: score.breakdown.budget,
            icon: Wallet,
            color: '#10B981',
            maxPoints: SCORE_WEIGHTS.budget,
            description: score.metrics.budgetAdherence >= 50
                ? t('healthScore.remaining', { pct: score.metrics.budgetAdherence.toFixed(0) })
                : t('healthScore.overBudget', { pct: (100 - score.metrics.budgetAdherence).toFixed(0) }),
        },
        {
            label: t('healthScore.savingsLabel'),
            value: score.breakdown.savings,
            icon: HandCoinsIcon,
            color: '#4F6BF5',
            maxPoints: SCORE_WEIGHTS.savings,
            description: score.metrics.savingsRate >= 20
                ? t('healthScore.savingsRateGood', { rate: score.metrics.savingsRate.toFixed(0) })
                : t('healthScore.savingsRateOk', { rate: score.metrics.savingsRate.toFixed(0) }),
        },
        {
            label: t('healthScore.activityLabel'),
            value: score.breakdown.activity,
            icon: Flame,
            color: '#EF4444',
            maxPoints: SCORE_WEIGHTS.activity,
            description: score.breakdown.activity >= 10
                ? t('healthScore.dailyLoggingStreak')
                : t('healthScore.logMoreTransactions'),
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-xl p-4 md:p-5 bg-card shadow-card transition-all overflow-visible"
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
                    <PopoverContent side="left" className="w-80 p-4 rounded-xl z-50">
                        <div className="space-y-4">
                            {/* Header */}
                            <div className="text-center pb-3 border-b border-border/50">
                                <p className="text-3xl font-black text-foreground">{score.total}</p>
                                <p className="text-xs text-muted-foreground">/ 100 {t('healthScore.score')}</p>
                            </div>

                            {/* Formula Reference */}
                            <div className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-lg">
                                <p className="font-semibold mb-1">{t('healthScore.coreFormula')}</p>
                                <p>{t('healthScore.balanceFormula')}</p>
                                <p>{t('healthScore.savingsRateFormula')}</p>
                            </div>

                                {/* Score Breakdown - 5 Components */}
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('healthScore.scoreBreakdown')}</p>
                                
                                {/* 1. Budget Score */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="w-4 h-4 text-emerald-500" />
                                            <span className="text-sm font-medium text-foreground">{t('healthScore.budgeting')}</span>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-emerald-500">
                                            {score.breakdown.budget}/{SCORE_WEIGHTS.budget}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 rounded-full transition-all"
                                            style={{ width: `${(score.breakdown.budget / SCORE_WEIGHTS.budget) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        {score.metrics.budgetAdherence >= 50 
                                            ? t('healthScore.remaining', { pct: score.metrics.budgetAdherence.toFixed(0) })
                                            : t('healthScore.overBudget', { pct: (100 - score.metrics.budgetAdherence).toFixed(0) })} • {t('healthScore.budgeting')}
                                    </p>
                                </div>

                                {/* 2. Savings Score */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <HandCoinsIcon className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm font-medium text-foreground">{t('healthScore.savings')}</span>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-blue-500">
                                            {score.breakdown.savings}/{SCORE_WEIGHTS.savings}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 rounded-full transition-all"
                                            style={{ width: `${(score.breakdown.savings / SCORE_WEIGHTS.savings) * 100}%` }}
                                        />
                                    </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {score.metrics.savingsRate.toFixed(1)}% {t('healthScore.rate')} • {t('healthScore.target')}: 20% (50/30/20 {t('healthScore.rule')})
                                        </p>
                                </div>

                                {/* 3. Trends Score */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-amber-500" />
                                            <span className="text-sm font-medium text-foreground">{t('healthScore.trendsLabel')}</span>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-amber-500">
                                            {score.breakdown.trends}/{SCORE_WEIGHTS.trends}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-amber-500 rounded-full transition-all"
                                            style={{ width: `${(score.breakdown.trends / SCORE_WEIGHTS.trends) * 100}%` }}
                                        />
                                    </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {score.metrics.expenseGrowthRate > 0 ? '+' : ''}{score.metrics.expenseGrowthRate.toFixed(1)}% {t('healthScore.momGrowth')} • {t('healthScore.alert')}: {score.metrics.expenseGrowthRate > 10 ? t('healthScore.spendCreepDetected') : t('healthScore.normal')}
                                        </p>
                                </div>

                                {/* 4. Activity Score */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Flame className="w-4 h-4 text-rose-500" />
                                            <span className="text-sm font-medium text-foreground">{t('healthScore.activity')}</span>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-rose-500">
                                            {score.breakdown.activity}/{SCORE_WEIGHTS.activity}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-rose-500 rounded-full transition-all"
                                            style={{ width: `${(score.breakdown.activity / SCORE_WEIGHTS.activity) * 100}%` }}
                                        />
                                    </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {t('healthScore.dailyReconSpeed')} • {SCORE_WEIGHTS.activity} {t('healthScore.ptsMax')}, -2/{t('healthScore.perDay')} {t('healthScore.inactive')}
                                        </p>
                                </div>

                                {/* 5. Accuracy Score */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Target className="w-4 h-4 text-purple-500" />
                                            <span className="text-sm font-medium text-foreground">{t('healthScore.accuracyLabel')}</span>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-purple-500">
                                            {score.breakdown.accuracy}/{SCORE_WEIGHTS.accuracy}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-purple-500 rounded-full transition-all"
                                            style={{ width: `${(score.breakdown.accuracy / SCORE_WEIGHTS.accuracy) * 100}%` }}
                                        />
                                    </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {t('healthScore.budgetVarianceTracking')}
                                        </p>
                                </div>
                            </div>

                            {/* 50/30/20 Rule Summary */}
                            {score.metrics.needsPercentage > 0 && (
                                <div className="pt-2 border-t border-border/50">
                                    <p className="text-[10px] font-semibold text-muted-foreground mb-2">{t('healthScore.rule502030Analysis')}</p>
                                    <div className="flex justify-between text-[10px]">
                                        <span className={score.metrics.needsPercentage <= 55 ? 'text-emerald-500' : 'text-rose-500'}>
                                            {t('healthScore.needs')}: {score.metrics.needsPercentage.toFixed(0)}% ({t('healthScore.target')}: 50%)
                                        </span>
                                        <span className={score.metrics.wantsPercentage <= 35 ? 'text-emerald-500' : 'text-rose-500'}>
                                            {t('healthScore.wants')}: {score.metrics.wantsPercentage.toFixed(0)}% ({t('healthScore.target')}: 30%)
                                        </span>
                                        <span className={score.metrics.savingsRate >= 15 ? 'text-emerald-500' : 'text-rose-500'}>
                                            {t('healthScore.savings')}: {score.metrics.savingsRate.toFixed(0)}% ({t('healthScore.target')}: 20%)
                                        </span>
                                    </div>
                                </div>
                            )}

                                {/* Formula Summary */}
                                <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                                    <p className="font-semibold mb-1">{t('healthScore.calculationWeights')}:</p>
                                    <p>{t('healthScore.budgetLabel')} ({SCORE_WEIGHTS.budget}) + {t('healthScore.savingsLabel')} ({SCORE_WEIGHTS.savings}) + {t('healthScore.trendsLabel')} ({SCORE_WEIGHTS.trends}) + {t('healthScore.activityLabel')} ({SCORE_WEIGHTS.activity}) + {t('healthScore.accuracyLabel')} ({SCORE_WEIGHTS.accuracy}) = 100</p>
                                </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Dual-Panel Layout */}
            <div className="grid grid-cols-5 gap-4 items-center">
                {/* Left Panel - Main Gauge (Right-aligned) */}
                <div className="col-span-2 flex justify-end">
                    <div
                        className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center"
                        aria-label="Health score"
                    >
                        <svg viewBox="0 0 136 136" className="w-full h-full transform -rotate-90">
                            {/* Track */}
                            <circle
                                cx="68"
                                cy="68"
                                r={radius}
                                stroke="currentColor"
                                className="text-muted/20"
                                strokeWidth="8"
                                fill="transparent"
                                strokeLinecap="round"
                            />
                            {/* Progress */}
                            <motion.circle
                                cx="68"
                                cy="68"
                                r={radius}
                                stroke={strokeColor}
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: offset }}
                                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
                            <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5, type: 'spring' }}
                                className="text-2xl font-black tracking-tighter"
                            >
                                {new Intl.NumberFormat(getLanguageLocale(language), { maximumFractionDigits: 0 }).format(score.total)}
                            </motion.span>
                            <span className="text-[10px] font-normal text-muted-foreground tracking-widest">{t('healthScore.score')}</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Sub-Score Column */}
                <div className="col-span-3 space-y-3 pl-2">
                    {miniScoreItems.map((item, index) => (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + index * 0.1 }}
                            className="flex items-center gap-3"
                        >
                            <MiniDonut value={item.value} color={item.color} size={48} strokeWidth={5} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                                    <p className="text-sm font-semibold text-foreground truncate">{item.label}</p>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Smart Insight */}
            <Popover>
                <PopoverTrigger asChild>
                    <div className="relative cursor-pointer transition-colors hover:bg-muted/30 active:scale-[0.98] transition-all mt-4 p-3 rounded-xl border border-border/50">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            {t('healthScore.smartInsight')}
                        </p>
                        <p className="text-sm font-medium text-foreground leading-relaxed">
                            {t(score.insightKey, score.insightParams)}
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
                            {t('healthScore.calculatedDesc')}
                        </p>
                        <ul className="space-y-2 text-xs">
                            <li className="flex items-start gap-2">
                                <Wallet className="w-4 h-4 text-emerald-500 mt-0.5" />
                                <div>
                                    <span className="font-semibold text-emerald-500">{t('healthScore.budgetAdherence')}</span>
                                    <p className="text-muted-foreground">{t('healthScore.budgetAdherenceDesc')}</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <HandCoinsIcon className="w-4 h-4 text-blue-500 mt-0.5" />
                                <div>
                                    <span className="font-semibold text-blue-500">{t('healthScore.savingsRate')}</span>
                                    <p className="text-muted-foreground">{t('healthScore.savingsRateDesc')}</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <TrendingUp className="w-4 h-4 text-amber-500 mt-0.5" />
                                <div>
                                    <span className="font-semibold text-amber-500">{t('healthScore.cashFlowTrends')}</span>
                                    <p className="text-muted-foreground">{t('healthScore.cashFlowTrendsDesc')}</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <Flame className="w-4 h-4 text-rose-500 mt-0.5" />
                                <div>
                                    <span className="font-semibold text-rose-500">{t('healthScore.dailyActivity')}</span>
                                    <p className="text-muted-foreground">{t('healthScore.dailyActivityDesc')}</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-2">
                                <Target className="w-4 h-4 text-purple-500 mt-0.5" />
                                <div>
                                    <span className="font-semibold text-purple-500">{t('healthScore.budgetAccuracy')}</span>
                                    <p className="text-muted-foreground">{t('healthScore.budgetAccuracyDesc')}</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Milestone badge */}
            {milestoneBadge && (
                <div className="flex items-center gap-2 mt-3">
                    <span className="text-base leading-none">{milestoneBadge.emoji}</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">{t(`healthScore.badge.${milestoneBadge.key}.name`, milestoneBadge.name)}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{t(`healthScore.badge.${milestoneBadge.key}.description`, milestoneBadge.description)}</p>
                    </div>
                </div>
            )}

            {/* Challenge a Friend button */}
            {showChallengeButton && (
                <button
                    className="w-full h-8 rounded-lg text-[10px] text-amber-600 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-1.5 font-bold mt-3"
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
        </motion.div>
    );
}
