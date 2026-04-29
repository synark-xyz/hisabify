import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, LayoutDashboardIcon, Target, List, Lightbulb, Grid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { Header } from '@/components/Header';
import { HisabifyLogo } from "@/components/HisabifyLogo";
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
    '/': 'nav.dashboard',
    '/budget': 'nav.budget',
    '/savings': 'nav.savings',
    '/expenses': 'nav.expenses',
    '/transactions': 'nav.transactions',
    '/insights': 'nav.analytics',
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

const getSidebarNavItems = (t: (k: string) => string) => [
    { path: '/', icon: LayoutDashboardIcon, label: t('nav.dashboard') },
    { path: '/budget', icon: Target, label: t('nav.budget') },
    { path: '/transactions', icon: List, label: t('nav.expenses') },
    { path: '/insights', icon: Lightbulb, label: t('nav.insights') },
    { path: '/more', icon: Grid, label: t('nav.more') },
];

export function Layout() {
    const [showManual, setShowManual] = useState(false);
    const scrollPositions = useRef<Record<string, number>>({});
    const previousPath = useRef<string>('');

    const location = useLocation();
    const navigate = useNavigate();
    const { isKeyboardOpen } = useVisualViewport();
    const { t } = useTranslation();

    const navItems = getSidebarNavItems(t);

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
        <div className="min-h-screen relative lg:flex">
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col lg:border-r lg:border-border/40 lg:bg-background/95 lg:backdrop-blur-xl lg:z-40">
                {/* Brand */}
                <div className="px-5 py-5 border-b border-border/30">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
                            <HisabifyLogo size={36} showText={false} className="overflow-hidden rounded-[8px]" />
                        </div>
                        <span className="font-black text-xl tracking-tight text-foreground">Hisabify</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive =
                            location.pathname === item.path ||
                            (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
                        const Icon = item.icon;
                        return (
                            <motion.button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                )}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {item.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-indicator"
                                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </nav>

                {/* Add transaction */}
                <div className="px-3 pb-6 pt-2 border-t border-border/30">
                    <motion.button
                        onClick={() => setShowManual(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        {t('transaction.addTransaction')}
                    </motion.button>
                </div>
            </aside>

            {/* Content area */}
            <div className="flex-1 min-w-0 lg:ml-64">
                <Header
                    title={getPageTitle(location.pathname)}
                    variant={location.pathname === '/profile' ? 'profile' : 'default'}
                    showBack={shouldShowBack}
                />

                <main className="relative z-10 pb-page-content lg:pb-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Mobile bottom nav */}
            <BottomNavigation />

            {/* Mobile FAB */}
            <AnimatePresence>
                {!isKeyboardOpen && (
                    <motion.button
                        onClick={() => setShowManual(true)}
                        aria-label="Add transaction"
                        data-testid="fab-button"
                        className="fixed right-4 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-fab flex items-center justify-center lg:hidden"
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
                onSuccess={() => {}}
            />
        </div>
    );
}
