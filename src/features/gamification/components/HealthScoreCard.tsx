import React from 'react';
import { motion } from 'framer-motion';
import { ChartPie, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useHealthScore } from '../hooks/useHealthScore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function HealthScoreCard() {
    const { score, loading } = useHealthScore();

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
            className="relative overflow-hidden rounded-3xl p-5 mb-6 isolate"
        >
            {/* Premium Dark Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e1e24] via-[#121216] to-[#000000] z-[-2]" />
            {/* Subtle Glow Effect based on score */}
            <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-20 z-[-1]"
                style={{ backgroundColor: strokeColor }}
            />

            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                        <ChartPie className="w-5 h-5" style={{ color: strokeColor }} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white tracking-tight">Financial Health</h3>
                        <p className="text-xs text-white/50">Your personal finance score</p>
                    </div>
                </div>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Info className="w-5 h-5 text-white/20 hover:text-white/60 transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-[#1a1a2e] border-white/10 text-white">
                            <div className="space-y-1.5 py-1 min-w-[120px]">
                                <p className="text-xs font-bold text-white/40 uppercase mb-2">Breakdown</p>
                                <div className="flex justify-between text-xs">
                                    <span>Budgeting</span>
                                    <span className="font-mono text-emerald-400">{score.breakdown.budget}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span>Savings</span>
                                    <span className="font-mono text-blue-400">{score.breakdown.savings}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span>Activity</span>
                                    <span className="font-mono text-amber-400">{score.breakdown.activity}</span>
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
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
                            stroke="rgba(255,255,255,0.05)"
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
                            className="drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5, type: "spring" }}
                            className="text-4xl font-black tracking-tighter"
                        >
                            {score.total}
                        </motion.span>
                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest mt-0.5">Score</span>
                    </div>
                </div>

                {/* Info / Tip */}
                <div className="flex-1 bg-white/5 rounded-2xl p-4 border border-white/5 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <TrendingUp className="w-12 h-12 rotate-[-15deg]" />
                    </div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        Smart Insight
                    </p>
                    <p className="text-sm font-medium text-white/90 leading-relaxed pr-2">
                        "{getTip()}"
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
