import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SplashScreenProps {
    onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Initializing secure vault...');

    // Progress simulation
    useEffect(() => {
        const duration = 2500; // 2.5s total
        const interval = 20;
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const newProgress = Math.min((currentStep / steps) * 100, 100);
            setProgress(newProgress);

            if (newProgress > 30 && newProgress < 60) {
                setMessage('Verifying encryption keys...');
            } else if (newProgress >= 60 && newProgress < 90) {
                setMessage('Syncing wallets...');
            } else if (newProgress >= 90) {
                setMessage('Ready');
            }

            if (currentStep >= steps) {
                clearInterval(timer);
                setTimeout(onComplete, 500); // Slight delay after 100%
            }
        }, interval);

        return () => clearInterval(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background">
            {/* Background Gradient & Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B4619] to-[#007BFF] opacity-10" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay" />
            <div className="absolute inset-0 backdrop-blur-3xl" />

            {/* Main Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-sm px-8">

                {/* Logo Container with Pulse Effect */}
                <div className="relative mb-12">
                    {/* Ripple/Pulse Effect */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-accent/20 blur-xl"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: [0, 0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Logo SVG */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="relative w-32 h-32"
                    >
                        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
                            <defs>
                                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#0B4619" />
                                    <stop offset="100%" stopColor="#007BFF" />
                                </linearGradient>
                            </defs>
                            {/* Shield/Secure Base */}
                            <path
                                d="M50 90C75 80 90 60 90 35V20L50 5L10 20V35C10 60 25 80 50 90Z"
                                fill="url(#logoGradient)"
                                opacity="0.9"
                            />
                            {/* Growth/Leaf/Trend Line */}
                            <path
                                d="M35 55C35 55 45 65 55 45C55 45 65 35 75 25"
                                stroke="white"
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M75 25L65 25M75 25L75 35"
                                stroke="white"
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </motion.div>
                </div>

                {/* Text Content */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl font-black tracking-tight text-foreground mb-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-blue-600">
                        Hisabify
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground/80 tracking-widest uppercase">
                        Your Pulse on Prosperity
                    </p>
                </motion.div>

                {/* Progress Section */}
                <div className="w-full space-y-3">
                    <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: "linear", duration: 0.1 }}
                        />
                    </div>
                    <div className="flex justify-between items-center text-xs font-medium font-mono text-muted-foreground/70 h-4">
                        <motion.span
                            key={message}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {message}
                        </motion.span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
