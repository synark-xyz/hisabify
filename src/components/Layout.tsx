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
    const { variant } = useTheme();
    const navigate = useNavigate();
    const { isPremium } = useSubscription();

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
        <div className="min-h-screen bg-transparent relative">
            {/* Common Animating Background (Cyberpunk only) */}
            {variant === 'cyberpunk' && <CyberpunkBackground />}

            <Header
                title={getPageTitle(location.pathname)}
                variant={location.pathname === '/profile' ? 'profile' : 'default'}
                showBack={isProfileSubPage}
                onBack={isProfileSubPage ? () => navigate('/profile') : undefined}
            />

            <main className="relative z-0">
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

            {/* Floating Nexus Button */}
            {!showManual && !showNexus && (
                <motion.button
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    whileHover={{ scale: 1.1, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleNexusClick}
                    className="fixed bottom-32 right-6 z-40 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-2xl flex items-center justify-center border-2 border-white/20 hover:bg-indigo-500 transition-colors"
                >
                    <Zap className="w-6 h-6 fill-current" />
                </motion.button>
            )}
        </div>
    );
}
