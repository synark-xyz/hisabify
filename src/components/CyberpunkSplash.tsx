import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Hexagon, Database } from 'lucide-react';

export function CyberpunkSplash({ onComplete }: { onComplete: () => void }) {
    const [stage, setStage] = useState(0);

    useEffect(() => {
        const timer1 = setTimeout(() => setStage(1), 1000);  // Logo visible for 1s
        const timer2 = setTimeout(() => setStage(2), 1800);  // Database icon
        const timer3 = setTimeout(() => setStage(3), 2600);  // Zap icon
        const timer4 = setTimeout(() => onComplete(), 3400); // Complete

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            clearTimeout(timer4);
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-50 bg-[#0a0f1c] flex flex-col items-center justify-center overflow-hidden">
            {/* Dynamic Background Grid */}
            <div
                className="absolute inset-0 z-0 opacity-20"
                style={{
                    backgroundImage: `
            linear-gradient(to right, #451a03 1px, transparent 1px),
            linear-gradient(to bottom, #115e59 1px, transparent 1px)
          `,
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)'
                }}
            />

            <div className="relative z-10 flex flex-col items-center">
                <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                    {/* Hexagon Spinners - Only visible during stages 1 and 2 */}
                    <AnimatePresence>
                        {stage >= 1 && stage < 3 && (
                            <>
                                <motion.div
                                    className="absolute inset-0"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ rotate: 360, opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.2 }}
                                    transition={{
                                        rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
                                        opacity: { duration: 0.5 },
                                        scale: { duration: 0.5 }
                                    }}
                                >
                                    <Hexagon className="w-full h-full text-primary/20" strokeWidth={1} />
                                </motion.div>

                                <motion.div
                                    className="absolute inset-0"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ rotate: -180, opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.2 }}
                                    transition={{
                                        rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
                                        opacity: { duration: 0.5 },
                                        scale: { duration: 0.5 }
                                    }}
                                >
                                    <Hexagon className="w-24 h-24 m-4 text-accent/20" strokeWidth={1} />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    {/* Central Icon Sequence */}
                    <AnimatePresence mode="wait">
                        {/* Stage 0: Show App Logo First */}
                        {stage === 0 && (
                            <motion.div
                                key="logo-intro"
                                initial={{ scale: 0, opacity: 0, rotate: -180 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                                transition={{
                                    scale: { type: "spring", duration: 0.8, bounce: 0.4 },
                                    opacity: { duration: 0.5 },
                                    rotate: { type: "spring", duration: 0.8 }
                                }}
                                className="absolute flex items-center justify-center"
                            >
                                {/* Glow Effect Behind Logo */}
                                <motion.div
                                    className="absolute inset-0 rounded-full bg-primary/20 blur-3xl"
                                    animate={{
                                        scale: [1, 1.4, 1],
                                        opacity: [0.3, 0.7, 0.3],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                />

                                {/* Donut Chart Logo */}
                                <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="relative z-10">
                                    <circle cx="50" cy="50" r="48" fill="none" />

                                    {/* Segment 1 - Teal */}
                                    <motion.path
                                        d="M 50 18 A 32 32 0 0 1 75.5 30.5 L 64.75 40.75 A 18 18 0 0 0 50 32 Z"
                                        fill="#00CED1"
                                        opacity="0.95"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 0.95 }}
                                        transition={{ duration: 0.3, delay: 0.1 }}
                                    />

                                    {/* Segment 2 - Gold */}
                                    <motion.path
                                        d="M 75.5 30.5 A 32 32 0 0 1 82 50 L 68 50 A 18 18 0 0 0 64.75 40.75 Z"
                                        fill="#FFD700"
                                        opacity="0.95"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 0.95 }}
                                        transition={{ duration: 0.3, delay: 0.25 }}
                                    />

                                    {/* Segment 3 - Pink */}
                                    <motion.path
                                        d="M 82 50 A 32 32 0 0 1 69.5 75.5 L 60.75 64.75 A 18 18 0 0 0 68 50 Z"
                                        fill="#FF2D95"
                                        opacity="0.95"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 0.95 }}
                                        transition={{ duration: 0.3, delay: 0.4 }}
                                    />

                                    {/* Segment 4 - Purple */}
                                    <motion.path
                                        d="M 69.5 75.5 A 32 32 0 0 1 50 82 L 50 68 A 18 18 0 0 0 60.75 64.75 Z"
                                        fill="#A855F7"
                                        opacity="0.95"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 0.95 }}
                                        transition={{ duration: 0.3, delay: 0.55 }}
                                    />

                                    <circle cx="50" cy="50" r="17" fill="white" opacity="0.98" />

                                    <motion.text
                                        x="50"
                                        y="58"
                                        fontSize="20"
                                        fontWeight="bold"
                                        fill="url(#cyberpunkLogoGradient)"
                                        textAnchor="middle"
                                        fontFamily="system-ui, -apple-system, sans-serif"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3, delay: 0.7 }}
                                    >
                                        $
                                    </motion.text>
                                </svg>
                            </motion.div>
                        )}

                        {/* Stage 1: Database Icon */}
                        {stage === 1 && (
                            <motion.div
                                key="database-icon"
                                initial={{ scale: 0, opacity: 0, rotate: -90 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0, opacity: 0, rotate: 90 }}
                                transition={{
                                    type: "spring",
                                    duration: 0.6,
                                    bounce: 0.4
                                }}
                                className="absolute"
                            >
                                <Database className="w-14 h-14 text-primary drop-shadow-[0_0_15px_rgba(0,240,255,0.9)]" />
                            </motion.div>
                        )}

                        {/* Stage 2: Zap Icon */}
                        {stage === 2 && (
                            <motion.div
                                key="zap-icon"
                                initial={{ scale: 0, opacity: 0, rotate: -90 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0, opacity: 0, rotate: 90 }}
                                transition={{
                                    type: "spring",
                                    duration: 0.6,
                                    bounce: 0.4
                                }}
                                className="absolute"
                            >
                                <Zap className="w-14 h-14 text-accent drop-shadow-[0_0_15px_rgba(255,215,0,0.9)]" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Text Glitch Effect */}
                <AnimatePresence>
                    {stage < 3 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{
                                opacity: { duration: 0.5 },
                                y: { duration: 0.5 }
                            }}
                            className="text-center"
                        >
                            <h1 className="text-4xl font-black text-white tracking-tighter mb-2" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                                <motion.span
                                    className="text-primary"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    HISAB
                                </motion.span>
                                <motion.span
                                    className="text-accent"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    IFY
                                </motion.span>
                            </h1>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 0.8, delay: 0.5 }}
                                className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto"
                            />
                            <motion.p
                                className="text-xs text-primary/60 font-mono mt-2 tracking-[0.3em] uppercase"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                            >
                                {stage === 0 && "Initializing..."}
                                {stage === 1 && "Loading Database..."}
                                {stage === 2 && "Powering Up..."}
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Loading Bar */}
            <AnimatePresence>
                {stage < 3 && (
                    <motion.div
                        className="absolute bottom-12 w-64 h-1 bg-white/10 rounded-full overflow-hidden"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.5 }}
                    >
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary via-accent to-primary shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 3.2, ease: "easeInOut" }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden gradient definition for logo dollar sign */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="cyberpunkLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00F0FF" />
                        <stop offset="50%" stopColor="#A855F7" />
                        <stop offset="100%" stopColor="#FF2D95" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}
