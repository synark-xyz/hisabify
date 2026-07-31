import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Monitor, ArrowLeft, Tag, Globe } from 'lucide-react';
import { ThemeColorPicker } from '@/components/ThemeColorPicker';
import { PageShell } from '@/components/PageShell';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useLanguage, languageNames } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type ThemeOption = 'light' | 'dark' | 'system';

export function PreferencesPage() {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();
    const { currency, setCurrency } = useCurrency();
    const { language, setLanguage } = useLanguage();
    const { toast } = useToast();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [preferences, setPreferences] = useState({
        dateFormat: 'DD/MM/YYYY',
        weekStartDay: 'monday',
        themePreference: 'system' as ThemeOption,
    });

    useEffect(() => {
        const loadPreferences = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('users')
                .select('date_format, week_start_day, theme')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setPreferences({
                    dateFormat: data.date_format || 'DD/MM/YYYY',
                    weekStartDay: data.week_start_day || 'monday',
                    themePreference: (data.theme as ThemeOption) || 'system',
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
                date_format: newPrefs.dateFormat,
                week_start_day: newPrefs.weekStartDay,
                theme: newPrefs.themePreference,
            })
            .eq('user_id', user.id);

        if (error) {
            toast({ title: t('settings.errorSaving'), description: error.message, variant: 'destructive' });
        }
    };

    const handleThemeChange = (newTheme: ThemeOption) => {
        handleSavePreferences({ themePreference: newTheme });
        if (newTheme === 'system') {
            // In a real app, you might want to listen to system changes, but for now just check once
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            setTheme(systemTheme);
        } else {
            setTheme(newTheme);
        }
    };

    return (
        <PageShell title="settings.preferences" backTo="/settings" className="py-6 space-y-6">

                {/* Accent Color Picker */}
                <ThemeColorPicker />

                {/* Theme Mode Selection */}
                <div className="p-4 bg-card rounded-2xl border border-border/50 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-xl">
                            {preferences.themePreference === 'dark' ? (
                                <Moon className="w-5 h-5 text-foreground" />
                            ) : preferences.themePreference === 'light' ? (
                                <Sun className="w-5 h-5 text-foreground" />
                            ) : (
                                <Monitor className="w-5 h-5 text-foreground" />
                            )}
                        </div>
                        <div>
                            <p className="font-bold text-foreground">{t('settings.theme')}</p>
                            <p className="text-sm text-muted-foreground">{t('settings.themeDesc')}</p>
                        </div>
                    </div>
                    <Select value={preferences.themePreference} onValueChange={(v) => handleThemeChange(v as ThemeOption)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">
                                <span className="flex items-center gap-2">
                                    <Sun className="w-4 h-4" /> {t('settings.themeLight')}
                                </span>
                            </SelectItem>
                            <SelectItem value="dark">
                                <span className="flex items-center gap-2">
                                    <Moon className="w-4 h-4" /> {t('settings.themeDark')}
                                </span>
                            </SelectItem>
                            <SelectItem value="system">
                                <span className="flex items-center gap-2">
                                    <Monitor className="w-4 h-4" /> {t('settings.themeSystem')}
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Currency Selector */}
                <div className="p-4 bg-card rounded-2xl border border-border/50 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <p className="font-bold text-foreground">{t('settings.currency')}</p>
                            <p className="text-sm text-muted-foreground">{t('settings.currencyDesc')}</p>
                        </div>
                    </div>
                    <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(currencyData).map(([code, { symbol, name }]) => (
                                <SelectItem key={code} value={code}>
                                    <span className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-accent">{symbol}</span>
                                        <span>{name}</span>
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Language Selector */}
                <div className="p-4 bg-card rounded-2xl border border-border/50 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-xl">
                            <Globe className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground">{t('settings.language')}</p>
                            <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
                        </div>
                    </div>
                    <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'bn' | 'ja')}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="bn">বাংলা</SelectItem>
                            <SelectItem value="ja">日本語</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Date Format */}
                <div className="p-4 bg-card rounded-2xl border border-border/50 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <p className="font-bold text-foreground">{t('settings.dateFormat')}</p>
                            <p className="text-sm text-muted-foreground">{t('settings.dateFormatDesc')}</p>
                        </div>
                    </div>
                    <Select
                        value={preferences.dateFormat}
                        onValueChange={(v) => handleSavePreferences({ dateFormat: v })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Week Start Day */}
                <div className="p-4 bg-card rounded-2xl border border-border/50 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <p className="font-bold text-foreground">{t('settings.weekStartsOn')}</p>
                            <p className="text-sm text-muted-foreground">{t('settings.weekStartsOnDesc')}</p>
                        </div>
                    </div>
                    <Select
                        value={preferences.weekStartDay}
                        onValueChange={(v) => handleSavePreferences({ weekStartDay: v })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sunday">{t('settings.weekSunday')}</SelectItem>
                            <SelectItem value="monday">{t('settings.weekMonday')}</SelectItem>
                            <SelectItem value="saturday">{t('settings.weekSaturday')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
        </PageShell>
    );
}
