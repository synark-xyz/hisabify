import React from 'react';
import { motion } from 'framer-motion';
import { ChartPie, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useHealthScore } from '../hooks/useHealthScore';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export function HealthScoreCard() {
    const { score, loading } = useHealthScore();
    const { variant } = useTheme();

    if (loading) {
        return <Skeleton className="w-full h-[180px] rounded-3xl" />;
    }

    if (!score) return null;

    const getScoreColor = (val: number) => {
        if (val >= 80) return '#10b981'; // emerald-500
        if (val >= 50) return '#f59e0b'; // amber-500
        return '#f43f5e'; // rose-500
    };

    const getTip = () => {
        const { budget, savings, activity } = score.breakdown;
        const lowest = Math.min(budget, savings, activity);

        if (lowest === budget) return "Stay within your budgets to boost your score.";
        if (lowest === savings) return "Consistent savings will improve your health.";
        if (lowest === activity) return "Log daily activity for maximum points.";
        return "Excellent financial discipline!";
    };

    // Circular gauge calculations
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score.total / 100) * circumference;
    const strokeColor = getScoreColor(score.total);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl p-5 mb-6 isolate bg-card shadow-card card-3d transition-all"
        >
            {/* Subtle Glow Effect based on score (Cyberpunk only) */}
            <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-20 z-[-1] hidden data-[variant=cyberpunk]:block"
                style={{ backgroundColor: strokeColor }}
            />

            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/10 backdrop-blur-sm">
                        <ChartPie className="w-5 h-5 icon-glow" style={{ color: strokeColor }} />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground tracking-tight">Financial Health</h3>
                        <p className="text-xs text-muted-foreground">Your personal finance score</p>
                    </div>
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <button className="focus:outline-none">
                            <Info className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors icon-glow" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent side="left" className="w-auto p-3">
                        <div className="space-y-1.5 min-w-[120px]">
                            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Breakdown</p>
                            <div className="flex justify-between text-xs gap-4">
                                <span>Budgeting</span>
                                <span className="font-mono text-emerald-500">{score.breakdown.budget}</span>
                            </div>
                            <div className="flex justify-between text-xs gap-4">
                                <span>Savings</span>
                                <span className="font-mono text-blue-500">{score.breakdown.savings}</span>
                            </div>
                            <div className="flex justify-between text-xs gap-4">
                                <span>Activity</span>
                                <span className="font-mono text-amber-500">{score.breakdown.activity}</span>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="flex items-center gap-6">
                {/* Gauge */}
                <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Track */}
                        <circle
                            cx="64"
                            cy="64"
                            r={radius}
                            stroke="currentColor"
                            className="text-muted/20"
                            strokeWidth="8"
                            fill="transparent"
                            strokeLinecap="round"
                        />
                        {/* Progress */}
                        <motion.circle
                            cx="64"
                            cy="64"
                            r={radius}
                            stroke={strokeColor}
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                            strokeLinecap="round"
                            className="drop-shadow-md"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground">
                        <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5, type: "spring" }}
                            className="text-4xl font-black tracking-tighter text-glow"
                        >
                            {score.total}
                        </motion.span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Score</span>
                    </div>
                </div>

                {/* Info / Tip */}
                <div className="flex-1 space-y-3">
                    <Popover>
                        <PopoverTrigger asChild>
                            <div className="bg-muted/30 rounded-2xl p-4 border border-border/50 relative overflow-hidden group cursor-pointer transition-colors hover:bg-muted/50 active:scale-[0.98] transition-all">
                                <div className="absolute top-0 right-0 p-3 opacity-10">
                                    <TrendingUp className="w-12 h-12 rotate-[-15deg] text-foreground" />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                    Smart Insight
                                </p>
                                <p className="text-sm font-medium text-foreground leading-relaxed pr-2">
                                    "{getTip()}"
                                </p>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" className="max-w-[300px] p-4 shadow-xl z-50">
                            <div className="space-y-3">
                                <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                                    <Info className="w-4 h-4 text-accent icon-glow" />
                                    How it works
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Your Financial Health Score is calculated based on three key factors:
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2 text-xs">
                                        <div className="mt-0.5 p-1 rounded-full bg-emerald-500/20 text-emerald-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-emerald-500">Budget Adherence (40%)</span>
                                            <p className="text-muted-foreground">Staying within your set budgets.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-2 text-xs">
                                        <div className="mt-0.5 p-1 rounded-full bg-blue-500/20 text-blue-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-blue-500">Savings Habits (40%)</span>
                                            <p className="text-muted-foreground">Consistently adding to goals.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-2 text-xs">
                                        <div className="mt-0.5 p-1 rounded-full bg-amber-500/20 text-amber-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-amber-500">Activity (20%)</span>
                                            <p className="text-muted-foreground">Regularly logging transactions.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </motion.div>
    );
}
