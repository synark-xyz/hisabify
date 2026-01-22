import { useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from './UpgradeModal';
import { Button } from './ui/button';

interface PremiumGuardProps {
    children: React.ReactNode;
    featureName?: string;
    className?: string;
}

export function PremiumGuard({ children, featureName = "Premium Feature", className }: PremiumGuardProps) {
    const { isPremium, loading } = useSubscription();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // If loading, render children (optimistic) or a skeleton. 
    // Rendering children might reveal data for a split second, so let's render a simple skeleton or null.
    // Actually, let's render children transparently or nothing to avoid flashes.
    if (loading) return <div className={cn("animate-pulse bg-muted rounded-lg w-full h-full min-h-[100px]", className)} />;

    if (isPremium) {
        return <>{children}</>;
    }

    return (
        <div className={cn("relative group overflow-hidden rounded-xl", className)}>
            <div className="blur-[4px] pointer-events-none select-none opacity-50 transition-all duration-300">
                {children}
            </div>

            <div className="absolute inset-0 flex items-center justify-center z-10 bg-gradient-to-b from-transparent to-background/20">
                <div className="text-center p-4">
                    <Button
                        onClick={() => setShowUpgradeModal(true)}
                        className="rounded-full shadow-lg gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 hover:scale-105 transition-all duration-300"
                    >
                        <Lock className="w-4 h-4" />
                        Unlock {featureName}
                    </Button>
                </div>
            </div>

            <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
        </div>
    );
}
