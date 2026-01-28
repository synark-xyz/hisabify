import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PrivacyMaskProps {
    children: React.ReactNode;
    className?: string;
    blurOnly?: boolean;
}

export function PrivacyMask({ children, className, blurOnly = false }: PrivacyMaskProps) {
    const { privacyMode } = useProfile();

    if (!privacyMode) {
        return <>{children}</>;
    }

    return (
        <div className={cn("relative inline-block overflow-hidden", className)}>
            <AnimatePresence mode="wait">
                <motion.div
                    key="masked"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                        "select-none cursor-default py-0.5 px-1 rounded-sm",
                        blurOnly ? "blur-sm" : "bg-muted/50 text-transparent blur-sm"
                    )}
                >
                    {blurOnly ? children : "****"}
                </motion.div>
            </AnimatePresence>
            {!blurOnly && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-muted-foreground/50 text-xs font-mono tracking-widest">****</span>
                </div>
            )}
        </div>
    );
}
