import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { ReceiptScannerModal, type ScannedReceiptData } from '@/components/ReceiptScannerModal';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { InputMethodSheet } from '@/components/InputMethodSheet';
import { VoiceInputFlow } from '@/components/VoiceInputFlow';
import { Header } from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { CyberpunkBackground } from '@/components/CyberpunkBackground';
import { cn } from '@/lib/utils';

export function Layout() {
    const [showManual, setShowManual] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showInputSheet, setShowInputSheet] = useState(false);
    const [showVoiceInput, setShowVoiceInput] = useState(false);
    const [smartData, setSmartData] = useState<
        { merchant?: string; amount?: number; category?: string; receiptUrl?: string | null; date?: Date; type?: 'expense' | 'income' } | undefined
    >(undefined);

    const location = useLocation();
    const { variant } = useTheme();
    const { isKeyboardOpen } = useVisualViewport();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [location.pathname]);

    useEffect(() => {
        const handleOpenInputSheet = () => setShowInputSheet(true);
        window.addEventListener('open-input-sheet', handleOpenInputSheet);
        return () => window.removeEventListener('open-input-sheet', handleOpenInputSheet);
    }, []);

    // Generic Header Logic
    const getPageTitle = (pathname: string) => {
        switch (pathname) {
            case '/': return 'Dashboard';
            case '/budget': return 'Budget';
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
    const isProfileRootPage = location.pathname === '/profile';
    const shouldShowBack = isProfileSubPage || isProfileRootPage;

    // Input method handlers
    const handleVoiceInput = () => {
        setShowInputSheet(false);
        setShowVoiceInput(true);
    };

    const handleReceiptInput = () => {
        setShowInputSheet(false);
        setShowScanner(true);
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
                showBack={shouldShowBack}
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

            <BottomNavigation />

            {/* Floating Action Button — fixed bottom-right, above nav bar */}
            <AnimatePresence>
                {!isKeyboardOpen && (
                    <motion.button
                        onClick={() => setShowInputSheet(true)}
                        aria-label="Add transaction"
                        data-testid="fab-button"
                        className="fixed right-4 z-50 w-14 h-14 rounded-full bg-accent text-white shadow-fab flex items-center justify-center"
                        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                        <Plus className="w-6 h-6" strokeWidth={2.5} />
                    </motion.button>
                )}
            </AnimatePresence>

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
                initialType={smartData?.type}
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
                    setSmartData({
                        merchant: data.merchant,
                        amount: data.amount,
                        type: data.type
                    });
                    setShowVoiceInput(false);
                    setShowManual(true);
                }}
            />

            {/* Receipt Scanner Modal */}
            <ReceiptScannerModal
                open={showScanner}
                onOpenChange={setShowScanner}
                onScanComplete={(data: ScannedReceiptData) => {
                    setSmartData({
                        merchant: data.merchant,
                        amount: data.amount,
                        date: data.date,
                        receiptUrl: data.receiptUrl,
                        type: 'expense'
                    });
                    setShowScanner(false);
                    setShowManual(true);
                }}
            />
        </div>
    );
}
