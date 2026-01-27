import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { requestNotificationPermission, sendNotification } from '@/lib/notifications';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export function NotificationSettingsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const { variant } = useTheme();

    const [preferences, setPreferences] = useState({
        budgetAlerts: true,
        emailNotifications: true,
        pushNotifications: false,
    });

    useEffect(() => {
        const loadPreferences = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('users')
                .select('budget_alerts_enabled, email_notifications_enabled, push_notifications_enabled')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setPreferences({
                    budgetAlerts: data.budget_alerts_enabled ?? true,
                    emailNotifications: data.email_notifications_enabled ?? true,
                    pushNotifications: data.push_notifications_enabled ?? false,
                });
            }
        };
        loadPreferences();
    }, [user]);

    const handleSavePreferences = async (updated: Partial<typeof preferences>) => {
        if (!user) return;
        const newPrefs = { ...preferences, ...updated };
        setPreferences(newPrefs);

        const { error } = await supabase
            .from('users')
            .update({
                budget_alerts_enabled: newPrefs.budgetAlerts,
                email_notifications_enabled: newPrefs.emailNotifications,
                push_notifications_enabled: newPrefs.pushNotifications,
            })
            .eq('user_id', user.id);

        if (error) {
            toast({ title: 'Error saving settings', description: error.message, variant: 'destructive' });
        }
    };

    const requestPushPermission = async () => {
        const granted = await requestNotificationPermission();
        if (granted) {
            handleSavePreferences({ pushNotifications: true });
            toast({ title: 'Push notifications enabled' });

            // Test notification
            sendNotification("Notifications Active!", {
                body: "You'll now receive alerts for your payments and budgets.",
                icon: "/pwa-192x192.png"
            });
        } else {
            toast({
                title: 'Permission pending or denied',
                description: 'Please check your browser notification settings.',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className={cn("min-h-screen pb-page-content", variant === 'cyberpunk' ? "bg-transparent" : "bg-background")}>
            <Header title="Notifications" showBack onBack={() => navigate('/settings')} />
            <main className="px-4 py-6 space-y-6">

                {/* Budget Alerts */}
                <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">Budget Alerts</p>
                            <p className="text-sm text-muted-foreground">Get notified when nearing limits</p>
                        </div>
                    </div>
                    <Switch
                        checked={preferences.budgetAlerts}
                        onCheckedChange={(checked) => handleSavePreferences({ budgetAlerts: checked })}
                    />
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Bell className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">Email Updates</p>
                            <p className="text-sm text-muted-foreground">Receive weekly summaries</p>
                        </div>
                    </div>
                    <Switch
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => handleSavePreferences({ emailNotifications: checked })}
                    />
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-xl">
                            <Smartphone className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">Push Notifications</p>
                            <p className="text-sm text-muted-foreground">Instant alerts on your device</p>
                        </div>
                    </div>
                    <Switch
                        checked={preferences.pushNotifications}
                        onCheckedChange={(checked) => {
                            if (checked) {
                                requestPushPermission();
                            } else {
                                handleSavePreferences({ pushNotifications: false });
                            }
                        }}
                    />
                </div>

            </main>
        </div>
    );
}
