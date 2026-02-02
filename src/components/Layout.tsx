import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNavigation } from '@/components/BottomNavigation';
import { NexusModal } from '@/components/NexusModal';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { UpgradeModal } from '@/components/UpgradeModal';
import { Header } from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { useSubscription } from '@/hooks/useSubscription';
import { CyberpunkBackground } from '@/components/CyberpunkBackground';
import { cn } from '@/lib/utils';

export function Layout() {
    const [showManual, setShowManual] = useState(false);
    const [showNexus, setShowNexus] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [smartData, setSmartData] = useState<any>(undefined);

    const location = useLocation();
    const { variant, theme } = useTheme();
    const navigate = useNavigate();
    const { isPremium } = useSubscription();

    // Get theme-aware colors for Nexus FAB
    const getNexusShadowColor = () => {
        if (variant === 'cyberpunk') {
            return theme === 'light'
                ? 'rgba(204, 136, 0, 0.5)' // Darker gold for light mode
                : 'rgba(255, 215, 0, 0.6)'; // Neon gold for dark mode
        }
        // Default theme - primary color
        return theme === 'light'
            ? 'rgba(255, 152, 0, 0.5)' // Orange for light mode
            : 'rgba(255, 152, 0, 0.6)'; // Orange for dark mode
    };

    // Generic Header Logic
    const getPageTitle = (pathname: string) => {
        switch (pathname) {
            case '/': return 'Dashboard';
            case '/budget': return 'Planner';
            case '/savings': return 'Savings';
            case '/expenses': return 'Expenses';
            case '/reports': return 'Reports';
            case '/profile': return 'Profile';
            case '/profile/personal': return 'Personal Info';
            case '/profile/data': return 'Data Management';
            case '/profile/invite': return 'Invite Friends';
            case '/analytics': return 'Analytics';
            default: return 'Hisabify';
        }
    };

    const isProfileSubPage = location.pathname.startsWith('/profile/');

    const handleNexusClick = () => {
        if (isPremium) {
            setShowNexus(true);
        } else {
            setShowUpgradeModal(true);
        }
    };

    return (
        <div className="min-h-screen relative">
            {/* Common Animating Background (Cyberpunk only) */}
            {variant === 'cyberpunk' && <CyberpunkBackground />}

            <Header
                title={getPageTitle(location.pathname)}
                variant={location.pathname === '/profile' ? 'profile' : 'default'}
                showBack={isProfileSubPage}
                onBack={isProfileSubPage ? () => navigate('/profile') : undefined}
            />

            <main className="relative z-10 pb-page-content">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            <BottomNavigation
                onAddTransaction={() => {
                    setSmartData(undefined);
                    setShowManual(true);
                }}
            />

            {/* Manual Entry Modal */}
            <AddTransactionModal
                open={showManual}
                onOpenChange={setShowManual}
                initialData={smartData}
                onSuccess={() => {
                    window.dispatchEvent(new Event('transaction-updated'));
                }}
            />

            {/* The Nexus (AI) Modal */}
            <NexusModal
                open={showNexus}
                onOpenChange={setShowNexus}
                onSmartCapture={(data) => {
                    setSmartData(data);
                    setShowNexus(false);
                    setShowManual(true);
                }}
            />

            {/* Premium Upgrade Modal */}
            <UpgradeModal
                open={showUpgradeModal}
                onOpenChange={setShowUpgradeModal}
                source="nexus_fab"
            />

            {/* Floating Nexus AI Button */}
            {!showManual && !showNexus && (
                <motion.button
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{
                        scale: 1,
                        rotate: 0,
                        boxShadow: variant === 'cyberpunk'
                            ? [
                                `0 4px 16px -4px ${getNexusShadowColor()}`,
                                `0 6px 20px -4px ${getNexusShadowColor().replace('0.5', '0.6').replace('0.6', '0.7')}`,
                                `0 4px 16px -4px ${getNexusShadowColor()}`,
                            ]
                            : undefined,
                    }}
                    whileHover={{ scale: 1.1, y: -4 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleNexusClick}
                    transition={{
                        boxShadow: {
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        },
                    }}
                    className={cn(
                        "fixed bottom-32 right-6 z-40 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center overflow-hidden",
                        variant === 'cyberpunk'
                            ? theme === 'light'
                                ? "bg-primary border-2 border-primary/60 text-primary-foreground"
                                : "bg-primary border-2 border-primary/40 text-primary-foreground"
                            : "bg-gradient-to-br from-primary to-accent text-primary-foreground border-2 border-primary/20"
                    )}
                >
                    {/* Icon */}
                    <Zap className="w-6 h-6 fill-current" />

                    {/* Premium badge indicator */}
                    {isPremium && (
                        <motion.div
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background shadow-sm"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 }}
                        />
                    )}
                </motion.button>
            )}
        </div>
    );
}
