import { useState, useEffect, useRef, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import { RatingSheet } from '@/components/RatingSheet';
import { PageFallback } from '@/components/PageTransition';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useAppRating } from '@/hooks/useAppRating';
import { Header } from '@/components/Header';
import { HisabifyLogo } from "@/components/HisabifyLogo";
import { BannerAd } from '@/components/BannerAd';
import { cn } from '@/lib/utils';
import { useFABContext } from "@/contexts/FABContext";
import { NAV_TABS, TAB_TITLES, isTabRoute, isTabActive } from '@/lib/navTabs';

export function Layout() {
    const [showManual, setShowManual] = useState(false);
    const scrollPositions = useRef<Record<string, number>>({});
    const previousPath = useRef<string>('');

    const location = useLocation();
    const navigate = useNavigate();
    const { isGlobalFABHidden } = useFABContext();
    const { isKeyboardOpen } = useVisualViewport();
    const { t } = useTranslation();
    // Periodic "how are we doing?" prompt — fires at most once a day until the user rates.
    const rating = useAppRating();

    const navItems = NAV_TABS;

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

    // Only the five tabs get the landing Header. Every child route renders its own
    // compact bar via PageShell — rendering both is what made pages look double-barred.
    const showLandingHeader = isTabRoute(location.pathname);

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
                        const isActive = isTabActive(item.path, location.pathname);
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
                                {t(item.labelKey)}
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
                {showLandingHeader && <Header title={TAB_TITLES[location.pathname]} />}

                {/* Anchored at the top on purpose: anything pinned to the bottom of the
                    viewport has to offset by var(--ad-banner-h), and this sidesteps that. */}
                <OfflineBanner />

                {/* This element is the single owner of the bottom inset that clears the
                    bottom nav, the FAB and the ad banner. `min-h-screen` sits on the same
                    box as the padding so (with border-box) the inset is absorbed into the
                    viewport height instead of adding a screenful of dead scroll. Pages must
                    NOT add their own `pb-page-content`/`pb-24`/`min-h-screen`. */}
                <main className="relative z-10 min-h-screen pb-page-content lg:pb-10">
                    {/* No route-level transition: fading the whole tree in/out fought with
                        scroll restore and the Suspense swap, which showed up as a glitch.
                        Suspense sits inside the layout so a lazily-loaded page swaps under
                        a header and bottom nav that never unmount. */}
                    {/* Keyed on the path so navigating away from a crashed page clears the
                        error instead of pinning it over every subsequent route. */}
                    <ErrorBoundary key={location.pathname} fullScreen={false} showGoHome={false}>
                        <Suspense fallback={<PageFallback />}>
                            <Outlet />
                        </Suspense>
                    </ErrorBoundary>
                </main>
            </div>

            {/* Mobile bottom nav */}
            <BannerAd />
            <BottomNavigation />

            {/* Mobile FAB */}
            <AnimatePresence>
                {!isKeyboardOpen && !isGlobalFABHidden && (
                    <motion.button
                        onClick={() => setShowManual(true)}
                        aria-label="Add transaction"
                        data-testid="fab-button"
                        className="fixed right-8 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-fab flex items-center justify-center lg:hidden"
                        style={{ bottom: 'calc(5.5rem + var(--ad-banner-h, 0px) + var(--safe-area-inset-bottom))' }}
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

            <RatingSheet
                open={rating.open}
                onOpenChange={rating.setOpen}
                onRated={rating.markRated}
                onDismissForever={rating.dismissForever}
                onDismissForNow={rating.dismissForNow}
            />
        </div>
    );
}
