import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNavigation } from '@/components/BottomNavigation';
import { NexusModal } from '@/components/NexusModal';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { InputMethodSheet } from '@/components/InputMethodSheet';
import { VoiceInputFlow } from '@/components/VoiceInputFlow';
import { Header } from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { CyberpunkBackground } from '@/components/CyberpunkBackground';
import { cn } from '@/lib/utils';

export function Layout() {
    const [showManual, setShowManual] = useState(false);
    const [showNexus, setShowNexus] = useState(false);
    const [showInputSheet, setShowInputSheet] = useState(false);
    const [showVoiceInput, setShowVoiceInput] = useState(false);
    const [nexusMode, setNexusMode] = useState<'voice' | 'scan'>('voice');
    const [smartData, setSmartData] = useState<any>(undefined);

    const location = useLocation();
    const { variant, theme } = useTheme();
    const navigate = useNavigate();

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

    // Input method handlers
    const handleVoiceInput = () => {
        setShowInputSheet(false);
        setShowVoiceInput(true);
    };

    const handleReceiptInput = () => {
        setShowInputSheet(false);
        setNexusMode('scan');
        setShowNexus(true);
    };

    const handleManualInput = () => {
        setShowInputSheet(false);
        setSmartData(undefined);
        setShowManual(true);
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
                onOpenInputSheet={() => setShowInputSheet(true)}
            />

            {/* Input Method Selection Sheet */}
            <InputMethodSheet
                open={showInputSheet}
                onOpenChange={setShowInputSheet}
                onVoice={handleVoiceInput}
                onReceipt={handleReceiptInput}
                onManual={handleManualInput}
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

            {/* Voice Input Flow */}
            <VoiceInputFlow
                open={showVoiceInput}
                onOpenChange={setShowVoiceInput}
                onComplete={(data) => {
                    setSmartData(data);
                    setShowVoiceInput(false);
                    setShowManual(true);
                }}
            />

            {/* The Nexus (Receipt Scanner) Modal */}
            <NexusModal
                open={showNexus}
                onOpenChange={setShowNexus}
                initialMode={nexusMode}
                onSmartCapture={(data) => {
                    setSmartData(data);
                    setShowNexus(false);
                    setShowManual(true);
                }}
            />
        </div>
    );
}
