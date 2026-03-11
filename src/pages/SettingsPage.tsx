import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, Bell, ChevronRight, LogOut, Shield, Headset, CircleHelp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export function SettingsPage() {
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const { toast } = useToast();
    const { variant } = useTheme();

    const handleSignOut = async () => {
        await signOut();
        toast({ title: 'Signed out successfully' });
        navigate('/auth');
    };

    const menuItems = [
        { id: 'preferences', icon: Settings, label: 'App Preferences', path: '/settings/preferences', color: 'bg-blue-500/10 text-blue-500' },
        { id: 'notifications', icon: Bell, label: 'Notifications', path: '/settings/notifications', color: 'bg-indigo-500/10 text-indigo-500' },
    ];

    const supportItems = [
        { id: 'help', icon: Headset, label: 'Help & Support', path: '/support', color: 'bg-emerald-500/10 text-emerald-500' },
        { id: 'privacy', icon: Shield, label: 'Privacy Policy', path: '/privacy', color: 'bg-emerald-500/10 text-emerald-500' },
        { id: 'faq', icon: CircleHelp, label: 'FAQ', path: '/faq', color: 'bg-emerald-500/10 text-emerald-500' },
    ];

    return (
        <div className={cn("min-h-screen pb-page-content", variant === 'cyberpunk' ? "bg-transparent" : "bg-background")}>
            <Header title="Settings" showBack />
            <main className="px-4 py-6 space-y-8">

                {/* General Settings */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">General</h3>
                    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm card-3d transition-all">
                        {menuItems.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${idx !== menuItems.length - 1 ? 'border-b border-border/50' : ''}`}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${item.color}`}>
                                        <item.icon className="w-5 h-5 icon-glow" />
                                    </div>
                                    <span className="font-semibold text-foreground">{item.label}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Support */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">Support</h3>
                    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm card-3d transition-all">
                        {supportItems.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${idx !== supportItems.length - 1 ? 'border-b border-border/50' : ''}`}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${item.color}`}>
                                        <item.icon className="w-5 h-5 icon-glow" />
                                    </div>
                                    <span className="font-semibold text-foreground">{item.label}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Sign Out */}
                <motion.button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-destructive/10 text-destructive font-bold hover:bg-destructive/20 transition-colors border-glow"
                    whileTap={{ scale: 0.95 }}
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </motion.button>

                <p className="text-center text-xs text-muted-foreground font-mono mt-8">
                    Hisabify v1.0.0 (Build 240)
                </p>

            </main>
        </div>
    );
}
