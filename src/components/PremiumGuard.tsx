import { useState, ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from './UpgradeModal';
import { Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Button } from './ui/button';

interface PremiumGuardProps {
    children: ReactNode;
    featureName?: string;
    className?: string; // Optional wrapper class
}

export function PremiumGuard({ children, featureName = "Premium Feature", className }: PremiumGuardProps) {
    const { isPremium, loading } = useSubscription();
    const [showUpgrade, setShowUpgrade] = useState(false);

    if (loading) {
        // Optionally return a skeleton or just render children invisibly, but usually waiting is fine.
        // For specific UI parts, rendering children might be cleaner to avoid layout shift, but let's just wait.
        return null;
    }

    if (isPremium) {
        return <>{children}</>;
    }

    return (
        <>
            <div
                className={cn("relative group cursor-pointer overflow-hidden rounded-xl", className)}
                onClick={() => setShowUpgrade(true)}
            >
                <div className="blur-sm select-none pointer-events-none opacity-50 transition-all duration-300 group-hover:blur-md group-hover:opacity-40">
                    {children}
                </div>

                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[1px] group-hover:bg-background/30 transition-colors">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Button
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition-opacity font-bold rounded-full shadow-xl shadow-purple-500/20"
                            onClick={() => setShowUpgrade(true)}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Be a Pro
                        </Button>
                    </motion.div>
                    <span className="mt-2 text-xs font-bold text-foreground/80 bg-background/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/10 uppercase tracking-widest">
                        Unlock {featureName}
                    </span>
                </div>
            </div>

            <UpgradeModal
                open={showUpgrade}
                onOpenChange={setShowUpgrade}
                source={`guard_${featureName}`}
            />
        </>
    );
}
