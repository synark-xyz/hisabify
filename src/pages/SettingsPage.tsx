import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bell, ChevronRight, LogOut, Shield, Headset, CircleHelp, MessageSquarePlus, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { FeedbackSheet } from '@/components/FeedbackSheet';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { getAppVersion, openStoreListing } from '@/lib/appStore';
import { cn } from '@/lib/utils';

export function SettingsPage() {
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [showFeedback, setShowFeedback] = useState(false);
    // Sourced from the native build (Gradle versionName/versionCode), never hardcoded.
    const [appVersion, setAppVersion] = useState('');

    useEffect(() => {
        void getAppVersion().then(setAppVersion);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        toast({ title: t('settings.signedOut') });
        navigate('/auth');
    };

    const menuItems = [
        { id: 'preferences', icon: Settings, label: t('settings.preferences'), path: '/settings/preferences', color: 'bg-accent/10 text-accent' },
        { id: 'notifications', icon: Bell, label: t('notifications.notifications'), path: '/settings/notifications', color: 'bg-primary/10 text-primary' },
    ];

    const supportItems = [
        { id: 'help', icon: Headset, label: t('common.helpSupport'), onSelect: () => navigate('/support'), color: 'bg-accent/10 text-accent' },
        { id: 'feedback', icon: MessageSquarePlus, label: t('feedback.title'), onSelect: () => setShowFeedback(true), color: 'bg-primary/10 text-primary' },
        { id: 'rate', icon: Star, label: t('rating.rateTheApp'), onSelect: () => { void openStoreListing(); }, color: 'bg-amber-500/10 text-amber-500' },
        { id: 'privacy', icon: Shield, label: t('page.privacyPolicy'), onSelect: () => navigate('/privacy'), color: 'bg-accent/10 text-accent' },
        { id: 'faq', icon: CircleHelp, label: t('page.faq'), onSelect: () => navigate('/faq'), color: 'bg-accent/10 text-accent' },
    ];

    return (
        <div className={cn("min-h-screen pb-page-content", "bg-background")}>
            <Header title={t('settings.title')} showBack />
            <main className="px-4 py-6 space-y-8">

                {/* General Settings */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-4">{t('settingsPage.general')}</h3>
                    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm card-3d transition-all">
                        <div className="px-4">
                        {menuItems.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center justify-between py-4 cursor-pointer hover:bg-muted/50 transition-colors ${idx !== menuItems.length - 1 ? 'border-b border-border/50' : ''}`}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                                        <item.icon className="w-5 h-5 icon-glow" />
                                    </div>
                                    <span className="font-semibold text-foreground">{item.label}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                            </motion.div>
                        ))}
                        </div>
                    </div>
                </section>

                {/* Support */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest pl-4">{t('settingsPage.support')}</h3>
                    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm card-3d transition-all">
                        <div className="px-4">
                        {supportItems.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                onClick={item.onSelect}
                                className={`flex items-center justify-between py-4 cursor-pointer hover:bg-muted/50 transition-colors ${idx !== supportItems.length - 1 ? 'border-b border-border/50' : ''}`}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                                        <item.icon className="w-5 h-5 icon-glow" />
                                    </div>
                                    <span className="font-semibold text-foreground">{item.label}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                            </motion.div>
                        ))}
                        </div>
                    </div>
                </section>

                {/* Sign Out */}
                <motion.button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 transition-colors border-glow"
                    whileTap={{ scale: 0.95 }}
                >
                    <LogOut className="w-5 h-5" />
                    {t('auth.logout')}
                </motion.button>

                {appVersion && (
                    <p className="text-center text-xs text-muted-foreground font-mono mt-8">
                        {t('settingsPage.version', { version: appVersion })}
                    </p>
                )}

            </main>

            <FeedbackSheet open={showFeedback} onOpenChange={setShowFeedback} />
        </div>
    );
}
