import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Monitor, ArrowLeft, Zap, CheckCircle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ThemeOption = 'light' | 'dark' | 'system';

export function PreferencesPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile();
    const { theme, variant, setTheme, setVariant } = useTheme();
    const { currency, setCurrency } = useCurrency();
    const { toast } = useToast();

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
            toast({ title: 'Error saving preferences', description: error.message, variant: 'destructive' });
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
        <div className={cn("min-h-screen pb-page-content", variant === 'cyberpunk' ? "bg-transparent" : "bg-background")}>
            <Header title="Preferences" showBack onBack={() => navigate('/settings')} />
            <main className="px-4 py-6 space-y-6">

                {/* Theme Style Selection */}
                <div className="p-4 bg-card rounded-2xl border border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Zap className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-bold text-foreground">Visual Style</p>
                                <p className="text-sm text-muted-foreground">Customize app aesthetics</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <button
                            onClick={() => setVariant('default')}
                            className={`relative p-3 rounded-xl border-2 transition-all text-left ${variant === 'default'
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/50'
                                }`}
                        >
                            <div className="font-bold text-sm mb-1">Default</div>
                            <div className="text-xs text-muted-foreground">Clean & Modern</div>
                            {variant === 'default' && <div className="absolute top-3 right-3 text-primary"><CheckCircle className="w-4 h-4" /></div>}
                        </button>

                        <button
                            onClick={() => {
                                // Pro Check Mock: In real app check profile.subscription_type === 'pro'
                                const isPro = profile?.subscription_type === 'pro';
                                if (isPro) {
                                    setVariant('cyberpunk');
                                } else {
                                    toast({
                                        title: "Pro Feature Locked",
                                        description: "Upgrade to Pro to unlock the Cyberpunk theme!",
                                        variant: "destructive"
                                    });
                                }
                            }}
                            className={`relative p-3 rounded-xl border-2 transition-all text-left overflow-hidden ${variant === 'cyberpunk'
                                ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                                : 'border-border hover:border-accent/50 group'
                                }`}
                        >
                            <div className="font-bold text-sm mb-1 flex items-center gap-1.5">
                                <span className={variant === 'cyberpunk' ? "text-accent" : ""}>Cyberpunk</span>
                                {profile?.subscription_type !== 'pro' && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-accent text-[10px] text-black font-bold flex items-center gap-0.5">
                                        PRO <Lock className="w-2.5 h-2.5" />
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground">Futuristic Gold & Teal</div>

                            {/* Preview gradient for cyberpunk */}
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>

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
                            <p className="font-bold text-foreground">Theme</p>
                            <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                        </div>
                    </div>
                    <Select value={preferences.themePreference} onValueChange={(v) => handleThemeChange(v as ThemeOption)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">
                                <span className="flex items-center gap-2">
                                    <Sun className="w-4 h-4" /> Light
                                </span>
                            </SelectItem>
                            <SelectItem value="dark">
                                <span className="flex items-center gap-2">
                                    <Moon className="w-4 h-4" /> Dark
                                </span>
                            </SelectItem>
                            <SelectItem value="system">
                                <span className="flex items-center gap-2">
                                    <Monitor className="w-4 h-4" /> System
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Currency Selector */}
                <div className="p-4 bg-card rounded-2xl border border-border/50 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <p className="font-bold text-foreground">Currency</p>
                            <p className="text-sm text-muted-foreground">Select your preferred currency</p>
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

                {/* Date Format */}
                <div className="p-4 bg-card rounded-2xl border border-border/50 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <p className="font-bold text-foreground">Date Format</p>
                            <p className="text-sm text-muted-foreground">How dates are displayed</p>
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
                            <p className="font-bold text-foreground">Week Starts On</p>
                            <p className="text-sm text-muted-foreground">First day of the week</p>
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
                            <SelectItem value="sunday">Sunday</SelectItem>
                            <SelectItem value="monday">Monday</SelectItem>
                            <SelectItem value="saturday">Saturday</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

            </main>
        </div>
    );
}
