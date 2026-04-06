import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { Header } from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { CyberpunkBackground } from '@/components/CyberpunkBackground';
import { cn } from '@/lib/utils';
import { emitTransactionUpdated } from '@/lib/transaction-events';

const PAGE_TITLES: Record<string, string> = {
    '/': 'nav.dashboard',
    '/budget': 'nav.budget',
    '/savings': 'nav.savings',
    '/expenses': 'nav.expenses',
    '/transactions': 'nav.transactions',
    '/insights': 'nav.insights',
    '/reports': 'nav.analytics',
    '/profile': 'nav.profile',
    '/profile/personal': 'profile.personalInfo',
    '/profile/data': 'profile.dataManagement',
    '/profile/invite': 'referral.yourCode',
    '/analytics': 'nav.analytics',
    '/debts': 'debt.debtTracker',
    '/activity': 'activity.activityHistory',
    '/categories': 'categories.categories',
    '/settings': 'nav.settings',
    '/settings/preferences': 'settings.preferences',
    '/settings/notifications': 'settings.notifications',
    '/more': 'nav.more',
    '/more/calculator': 'calculator.calculator',
    '/more/loan': 'calculator.loanCalculator',
    '/more/discount': 'calculator.discountTax',
    '/more/currency': 'calculator.currencyConverter',
};

const getPageTitle = (pathname: string) => PAGE_TITLES[pathname] ?? 'common.hisabify';

export function Layout() {
    const [showManual, setShowManual] = useState(false);
    const scrollPositions = useRef<Record<string, number>>({});
    const previousPath = useRef<string>('');

    const location = useLocation();
    const { variant } = useTheme();
    const { isKeyboardOpen } = useVisualViewport();

    useEffect(() => {
        const currentPath = location.pathname;
        const isNavigatingBack = previousPath.current && previousPath.current !== currentPath;
        
        if (isNavigatingBack && scrollPositions.current[previousPath.current]) {
            window.scrollTo({ top: scrollPositions.current[previousPath.current], behavior: 'auto' });
        } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
        
        scrollPositions.current[previousPath.current] = window.scrollY;
        previousPath.current = currentPath;
    }, [location.pathname]);

    useEffect(() => {
        const handleOpenModal = () => setShowManual(true);
        window.addEventListener('open-input-sheet', handleOpenModal);
        return () => window.removeEventListener('open-input-sheet', handleOpenModal);
    }, []);

    const isProfileSubPage = location.pathname.startsWith('/profile/');
    const isProfileRootPage = location.pathname === '/profile';
    const isDebtPage = location.pathname === '/debts';
    const isActivityPage = location.pathname === '/activity';
    const shouldShowBack = isProfileSubPage || isProfileRootPage || isDebtPage || isActivityPage;

    return (
        <div className="min-h-screen relative">
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

            {/* Floating Action Button */}
            <AnimatePresence>
                {!isKeyboardOpen && (
                    <motion.button
                        onClick={() => setShowManual(true)}
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

            <AddTransactionModal
                open={showManual}
                onOpenChange={setShowManual}
                onSuccess={() => {
                    emitTransactionUpdated();
                }}
            />
        </div>
    );
}
