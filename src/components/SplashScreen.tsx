import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { HisabifyLogo } from './HisabifyLogo';

const MESSAGES = [
    'Crunching the numbers…',
    'Fetching your data…',
    'Almost ready…',
    "Let's go",
];

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const [progress, setProgress] = useState(0);
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const duration = 2500; // 2.5s total
        const interval = 20;
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const newProgress = Math.min((currentStep / steps) * 100, 100);
            setProgress(newProgress);

            if (newProgress > 25 && newProgress < 50) {
                setMessageIndex(1);
            } else if (newProgress >= 50 && newProgress < 85) {
                setMessageIndex(2);
            } else if (newProgress >= 85) {
                setMessageIndex(3);
            }

            if (currentStep >= steps) {
                clearInterval(timer);
                setTimeout(onComplete, 500);
            }
        }, interval);

        return () => clearInterval(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background">
            {/* Background — layered radial glows for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
            <div
                className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-[0.08] blur-[120px] pointer-events-none"
                style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
            />
            <div
                className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full opacity-[0.07] blur-[100px] pointer-events-none"
                style={{ background: 'radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)' }}
            />

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-sm px-8">

                {/* Logo with ripple rings + spring entrance */}
                <div className="relative mb-12">
                    {/* Outer ripple */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-primary/10 blur-2xl"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1.8, opacity: [0, 0.35, 0] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                    />
                    {/* Inner ripple */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-accent/10 blur-xl"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1.4, opacity: [0, 0.3, 0] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1.0 }}
                    />

                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                            type: 'spring',
                            stiffness: 180,
                            damping: 20,
                            delay: 0.15,
                            opacity: { duration: 0.5, ease: 'easeOut', delay: 0.15 }
                        }}
                        className="relative"
                    >
                        <HisabifyLogo size={180} showText={false} />
                    </motion.div>
                </div>

                {/* Brand name + tagline */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h1
                        className="text-5xl font-black text-foreground mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-blue-600"
                        style={{ letterSpacing: '-0.03em' }}
                    >
                        Hisabify
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground/60">
                        Your pulse on prosperity
                    </p>
                </motion.div>

                {/* Progress */}
                <div className="w-full space-y-3">
                    <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
                        <motion.div
                            className="h-full rounded-full shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                            style={{
                                background: 'linear-gradient(to right, #10b981, #3b82f6, #8b5cf6)'
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: "linear", duration: 0.1 }}
                        />
                    </div>
                    <div className="flex justify-between items-center text-xs font-medium font-mono text-muted-foreground/70 h-4">
                        <motion.span
                            key={messageIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            {MESSAGES[messageIndex]}
                        </motion.span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
