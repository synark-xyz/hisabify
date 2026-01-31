import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Hexagon, Database } from 'lucide-react';

export function CyberpunkSplash({ onComplete }: { onComplete: () => void }) {
    const [stage, setStage] = useState(0);

    useEffect(() => {
        const timer1 = setTimeout(() => setStage(1), 800);
        const timer2 = setTimeout(() => setStage(2), 1600);
        const timer3 = setTimeout(() => onComplete(), 2500);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
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
                    {/* Hexagon Spinner */}
                    <motion.div
                        className="absolute inset-0"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    >
                        <Hexagon className="w-full h-full text-primary/20" strokeWidth={1} />
                    </motion.div>

                    <motion.div
                        className="absolute inset-0"
                        animate={{ rotate: -180 }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    >
                        <Hexagon className="w-24 h-24 m-4 text-accent/20" strokeWidth={1} />
                    </motion.div>

                    {/* Central Icon Sequence */}
                    <AnimatePresence mode="wait">
                        {stage === 0 && (
                            <motion.div
                                key="icon-1"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 2, opacity: 0 }}
                                className="absolute"
                            >
                                <Database className="w-12 h-12 text-primary drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
                            </motion.div>
                        )}
                        {stage === 1 && (
                            <motion.div
                                key="icon-2"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 2, opacity: 0 }}
                                className="absolute"
                            >
                                <Zap className="w-12 h-12 text-accent drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]" />
                            </motion.div>
                        )}
                        {stage >= 2 && (
                            <motion.div
                                key="logo"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="absolute flex items-center justify-center"
                            >
                                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.4)] relative overflow-hidden">
                                    {/* Scanline overlay */}
                                    <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(0,0,0,0.2)_50%,transparent)] bg-[length:100%_4px]" />

                                    {/* Donut Chart Logo */}
                                    <svg width="40" height="40" viewBox="0 0 100 100" fill="none" className="z-10">
                                        {/* Segment 1 - Teal */}
                                        <motion.path
                                            d="M 50 18 A 32 32 0 0 1 75.5 30.5 L 64.75 40.75 A 18 18 0 0 0 50 32 Z"
                                            fill="currentColor"
                                            className="text-primary"
                                            opacity="0.95"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.2, delay: 0 }}
                                        />

                                        {/* Segment 2 - Gold */}
                                        <motion.path
                                            d="M 75.5 30.5 A 32 32 0 0 1 82 50 L 68 50 A 18 18 0 0 0 64.75 40.75 Z"
                                            fill="currentColor"
                                            className="text-accent"
                                            opacity="0.95"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.2, delay: 0.2 }}
                                        />

                                        {/* Segment 3 - Pink */}
                                        <motion.path
                                            d="M 82 50 A 32 32 0 0 1 69.5 75.5 L 60.75 64.75 A 18 18 0 0 0 68 50 Z"
                                            fill="#FF00FF"
                                            opacity="0.95"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.2, delay: 0.4 }}
                                        />

                                        {/* Segment 4 - Purple */}
                                        <motion.path
                                            d="M 69.5 75.5 A 32 32 0 0 1 50 82 L 50 68 A 18 18 0 0 0 60.75 64.75 Z"
                                            fill="#A855F7"
                                            opacity="0.95"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.2, delay: 0.6 }}
                                        />

                                        {/* Inner circle */}
                                        <circle cx="50" cy="50" r="17" fill="#0a0f1c" opacity="0.98" />

                                        {/* Dollar sign */}
                                        <text
                                            x="50"
                                            y="58"
                                            fontSize="20"
                                            fontWeight="bold"
                                            fill="currentColor"
                                            textAnchor="middle"
                                            className="text-accent"
                                            fontFamily="system-ui, -apple-system, sans-serif"
                                        >
                                            $
                                        </text>
                                    </svg>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Text Glitch Effect */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-center"
                >
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                        <span className="text-primary">HISAB</span>
                        <span className="text-accent">IFY</span>
                    </h1>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto"
                    />
                    <p className="text-xs text-primary/60 font-mono mt-2 tracking-[0.3em] uppercase">System Initialized</p>
                </motion.div>
            </div>

            {/* Loading Bar */}
            <div className="absolute bottom-12 w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-accent box-shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.2, ease: "easeInOut" }}
                />
            </div>
        </div>
    );
}
