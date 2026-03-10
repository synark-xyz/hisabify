import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Sun, Moon, CloudSun, Sparkle } from '@phosphor-icons/react';

export function StreamingGreeting() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const [greeting, setGreeting] = useState('');
    const [displayText, setDisplayText] = useState('');
    const [index, setIndex] = useState(0);

    const userName = profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

    useEffect(() => {
        const hour = new Date().getHours();
        let currentGreeting = '';
        if (hour < 12) currentGreeting = 'Good morning';
        else if (hour < 18) currentGreeting = 'Good afternoon';
        else currentGreeting = 'Good evening';

        setGreeting(`${currentGreeting}, ${userName}`);
    }, [userName]);

    useEffect(() => {
        if (index < greeting.length) {
            const timeout = setTimeout(() => {
                setDisplayText((prev) => prev + greeting[index]);
                setIndex((prev) => prev + 1);
            }, 50);
            return () => clearTimeout(timeout);
        }
    }, [index, greeting]);

    const getIcon = () => {
        const hour = new Date().getHours();
        if (hour < 12) return <Sun className="w-5 h-5 text-amber-400" weight="duotone" />;
        if (hour < 18) return <CloudSun className="w-5 h-5 text-orange-400" weight="duotone" />;
        return <Moon className="w-5 h-5 text-indigo-400" weight="duotone" />;
    };

    return (
        <div className="flex items-center gap-3 px-1">
            <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center border border-border/50 shadow-sm"
                style={{ willChange: 'transform' }}
            >
                {getIcon()}
            </motion.div>
            <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-h-[1.75rem]">
                    <h1
                        className="text-xl font-black tracking-tight text-foreground"
                        style={{
                            contain: 'layout style',
                            willChange: 'contents',
                            minWidth: '200px'
                        }}
                    >
                        {displayText}
                    </h1>
                    {index >= greeting.length && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className="text-accent"
                            style={{ willChange: 'transform, opacity' }}
                        >
                            <Sparkle size={16} weight="fill" />
                        </motion.div>
                    )}
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-foreground">
                    Welcome back to your money tracker, Hisabify!
                </p>
            </div>
        </div>
    );
}
