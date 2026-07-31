import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { AlertTriangle, Bell, Smartphone } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { requestNotificationPermission, sendNotification } from '@/lib/notifications';
import { setBudgetAlertsEnabled } from '@/lib/notificationManager';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

export function NotificationSettingsPage() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { toast } = useToast();
    const currentTokenRef = useRef<string | null>(null);

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
                const budgetAlerts = data.budget_alerts_enabled ?? true;
                setPreferences({
                    budgetAlerts,
                    emailNotifications: data.email_notifications_enabled ?? true,
                    pushNotifications: data.push_notifications_enabled ?? false,
                });
                setBudgetAlertsEnabled(budgetAlerts);
            }
        };
        loadPreferences();
    }, [user]);

    const handleSavePreferences = async (updated: Partial<typeof preferences>) => {
        if (!user) return;
        const newPrefs = { ...preferences, ...updated };
        setPreferences(newPrefs);
        if ('budgetAlerts' in updated) {
            setBudgetAlertsEnabled(newPrefs.budgetAlerts);
        }

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

    const enableNativePush = async () => {
        try {
            const { PushNotifications } = await import('@capacitor/push-notifications');

            const permStatus = await PushNotifications.checkPermissions();
            let granted = permStatus.receive === 'granted';

            if (permStatus.receive === 'prompt') {
                const result = await PushNotifications.requestPermissions();
                granted = result.receive === 'granted';
            }

            if (!granted) {
                toast({
                    title: 'Permission denied',
                    description: 'Enable notifications in your device settings.',
                    variant: 'destructive',
                });
                return;
            }

            await PushNotifications.register();

            // Capture the token for potential later removal
            const tokenListener = await PushNotifications.addListener('registration', (token) => {
                currentTokenRef.current = token.value;
                tokenListener.remove();
            });

            await handleSavePreferences({ pushNotifications: true });
            toast({ title: 'Push notifications enabled' });
        } catch (err) {
            logger.error(err, { component: 'NotificationSettings', action: 'enableNativePush' });
            toast({ title: 'Failed to enable notifications', variant: 'destructive' });
        }
    };

    const requestPushPermission = async () => {
        if (Capacitor.getPlatform() === 'android') {
            await enableNativePush();
            return;
        }

        // Web fallback
        const granted = await requestNotificationPermission();
        if (granted) {
            await handleSavePreferences({ pushNotifications: true });
            toast({ title: 'Push notifications enabled' });

            sendNotification('Notifications Active!', {
                body: "You'll now receive alerts for your payments and budgets.",
                icon: '/pwa-192x192.png',
            });
        } else {
            toast({
                title: 'Permission pending or denied',
                description: 'Please check your browser notification settings.',
                variant: 'destructive',
            });
        }
    };

    const disablePush = async () => {
        if (!user) return;

        // Delete all FCM tokens for this user regardless of whether we have
        // the current token in memory (avoids orphaned tokens on re-login).
        await supabase.from('fcm_tokens').delete().eq('user_id', user.id);
        currentTokenRef.current = null;

        await handleSavePreferences({ pushNotifications: false });
    };

    return (
        <PageShell title="settings.notifications" backTo="/settings" className="py-6 space-y-6">

                {/* Budget Alerts */}
                <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">{t('notificationSettings.budgetAlerts')}</p>
                            <p className="text-sm text-muted-foreground">{t('notificationSettings.budgetAlertsDesc')}</p>
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
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Bell className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">{t('notificationSettings.emailUpdates')}</p>
                            <p className="text-sm text-muted-foreground">{t('notificationSettings.emailUpdatesDesc')}</p>
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
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Smartphone className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">{t('notificationSettings.pushNotifications')}</p>
                            <p className="text-sm text-muted-foreground">{t('notificationSettings.pushNotificationsDesc')}</p>
                        </div>
                    </div>
                    <Switch
                        checked={preferences.pushNotifications}
                        onCheckedChange={(checked) => {
                            if (checked) {
                                requestPushPermission();
                            } else {
                                disablePush();
                            }
                        }}
                    />
                </div>

        </PageShell>
    );
}
