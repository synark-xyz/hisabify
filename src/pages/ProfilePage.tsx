import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/UpgradeModal';
import {
  User, Settings, Shield, HelpCircle, ChevronRight,
  Camera, Save, LogOut, Moon, Sun, Bell, Database,
  Download, Trash2, AlertTriangle, Monitor, Crown, Sparkles
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { PremiumGuard } from '@/components/PremiumGuard';
import { requestNotificationPermission, sendNotification } from '@/lib/notifications';

type ThemeOption = 'light' | 'dark' | 'system';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { profile, setProfile, updateAvatar, refreshProfile } = useProfile();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState({
    display_name: profile.display_name || '',
    phone: profile.phone || '',
  });
  const [phoneError, setPhoneError] = useState('');

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Preferences state
  const [preferences, setPreferences] = useState({
    dateFormat: 'DD/MM/YYYY',
    weekStartDay: 'monday',
    themePreference: 'system' as ThemeOption,
    budgetAlerts: true,
    emailNotifications: true,
    pushNotifications: false,
  });

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Sync localProfile when profile changes
  useEffect(() => {
    setLocalProfile({
      display_name: profile.display_name || '',
      phone: profile.phone || '',
    });
  }, [profile.display_name, profile.phone]);

  // Load preferences from Supabase
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('date_format, week_start_day, theme, budget_alerts_enabled, email_notifications_enabled, push_notifications_enabled')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setPreferences({
          dateFormat: data.date_format || 'DD/MM/YYYY',
          weekStartDay: data.week_start_day || 'monday',
          themePreference: (data.theme as ThemeOption) || 'system',
          budgetAlerts: data.budget_alerts_enabled ?? true,
          emailNotifications: data.email_notifications_enabled ?? true,
          pushNotifications: data.push_notifications_enabled ?? false,
        });

        // Apply saved theme
        if (data.theme && data.theme !== 'system') {
          setTheme(data.theme as 'light' | 'dark');
        }
      }
    };

    loadPreferences();
  }, [user, setTheme]);

  // Validate phone number format
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true;
    const phoneRegex = /^[+]?[\d\s\-()]{0,20}$/;
    return phoneRegex.test(phone);
  };

  // Sanitize phone input
  const sanitizePhone = (phone: string): string => {
    return phone.replace(/[^\d\s\-()+]/g, '').slice(0, 20);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!validatePhone(localProfile.phone)) {
      setPhoneError('Please enter a valid phone number');
      return;
    }
    setPhoneError('');

    setLoading(true);

    const sanitizedDisplayName = localProfile.display_name.trim().slice(0, 100);
    const sanitizedPhone = sanitizePhone(localProfile.phone);

    const { error } = await supabase
      .from('users')
      .upsert({
        user_id: user.id,
        display_name: sanitizedDisplayName || null,
        phone: sanitizedPhone || null,
        avatar_url: profile.avatar_url,
      }, { onConflict: 'user_id' });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated successfully' });
      setProfile({
        ...profile,
        display_name: sanitizedDisplayName,
        phone: sanitizedPhone,
      });
      setIsEditing(false);
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    setLoading(true);
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    await updateAvatar(publicUrl);
    toast({ title: 'Avatar updated' });
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' });
      return;
    }

    if (passwords.new.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setPasswordLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: passwords.new,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated successfully' });
      setShowPasswordChange(false);
      setPasswords({ current: '', new: '', confirm: '' });
    }

    setPasswordLoading(false);
  };

  const handleSavePreferences = async (updatedPreferences: Partial<typeof preferences>) => {
    if (!user) return;

    const newPreferences = { ...preferences, ...updatedPreferences };
    setPreferences(newPreferences);

    const { error } = await supabase
      .from('users')
      .update({
        date_format: newPreferences.dateFormat,
        week_start_day: newPreferences.weekStartDay,
        theme: newPreferences.themePreference,
        budget_alerts_enabled: newPreferences.budgetAlerts,
        email_notifications_enabled: newPreferences.emailNotifications,
        push_notifications_enabled: newPreferences.pushNotifications,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error saving preferences', description: error.message, variant: 'destructive' });
    }
  };

  const handleThemeChange = (newTheme: ThemeOption) => {
    handleSavePreferences({ themePreference: newTheme });
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
    } else {
      setTheme(newTheme);
    }
  };

  const handleExportAllData = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Fetch all user data
      const [transactionsRes, budgetsRes, cardsRes, savingsRes, remindersRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('budgets').select('*').eq('user_id', user.id),
        supabase.from('cards').select('*').eq('user_id', user.id),
        supabase.from('savings_goals').select('*').eq('user_id', user.id),
        supabase.from('payment_reminders').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        profile: { ...profile, email: user.email },
        transactions: transactionsRes.data || [],
        budgets: budgetsRes.data || [],
        cards: cardsRes.data || [],
        savingsGoals: savingsRes.data || [],
        paymentReminders: remindersRes.data || [],
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `hisabify_export_${format(new Date(), 'yyyy-MM-dd')}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: 'Data exported successfully' });
    } catch (error) {
      toast({ title: 'Export failed', description: 'Could not export data', variant: 'destructive' });
    }

    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setDeleteLoading(true);

    try {
      // Delete all user data
      await Promise.all([
        supabase.from('transactions').delete().eq('user_id', user!.id),
        supabase.from('budgets').delete().eq('user_id', user!.id),
        supabase.from('cards').delete().eq('user_id', user!.id),
        supabase.from('savings_goals').delete().eq('user_id', user!.id),
        supabase.from('payment_reminders').delete().eq('user_id', user!.id),
        supabase.from('recurring_expenses').delete().eq('user_id', user!.id),
        supabase.from('report_templates').delete().eq('user_id', user!.id),
      ]);

      // Sign out (full account deletion would require admin action)
      await signOut();
      toast({ title: 'Account data deleted', description: 'Your data has been removed. Contact support to fully delete your account.' });
      navigate('/auth');
    } catch (error) {
      toast({ title: 'Error', description: 'Could not delete account data', variant: 'destructive' });
    }

    setDeleteLoading(false);
    setShowDeleteDialog(false);
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

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out successfully' });
    navigate('/auth');
  };

  const menuItems = [
    { id: 'personal', icon: User, label: 'Personal' },
    { id: 'preferences', icon: Settings, label: 'Preferences' },
    { id: 'notifications', icon: Bell, label: 'Alerts' },
    { id: 'data', icon: Database, label: 'Data' },
  ];

  return (
    <div className="min-h-screen bg-background pb-page-content fade-bottom-overlay">
      <div className="max-w-md mx-auto">
        <Header title="Settings" />

        <main className="px-4 space-y-6">
          {/* Profile Card */}
          <motion.div
            className="bg-card rounded-2xl p-6 shadow-card text-center relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="relative inline-block">
              <Avatar className="w-24 h-24 mx-auto ring-4 ring-accent ring-offset-4 ring-offset-background">
                <AvatarImage src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {profile.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-accent rounded-full text-accent-foreground shadow-lg hover:bg-accent/90 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <h2 className="text-xl font-bold text-foreground mt-4 flex items-center justify-center gap-2">
              {profile.display_name || user?.email?.split('@')[0]}
              {isPremium && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[10px] font-black text-accent uppercase tracking-wider">
                  PRO
                </span>
              )}
            </h2>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </motion.div>

          {/* Premium Card Upsell */}
          {!subscriptionLoading && !isPremium && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              onClick={() => setShowUpgradeModal(true)}
              className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-5 text-white shadow-xl shadow-purple-500/20 cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Support Development</span>
                  </div>
                  <h3 className="text-lg font-black">Go Premium</h3>
                  <p className="text-xs text-white/70 font-medium">Unlock all features & support the project</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-white" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab Navigation */}
          <motion.div
            className="bg-card rounded-2xl shadow-card overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted">
                {menuItems.map((item) => (
                  <TabsTrigger
                    key={item.id}
                    value={item.id}
                    className="flex flex-col gap-1 py-3 data-[state=active]:bg-card"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px]">{item.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Personal Info Tab */}
              <TabsContent value="personal" className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">Personal Information</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                    disabled={loading}
                  >
                    {isEditing ? (
                      <><Save className="w-4 h-4 mr-1" /> Save</>
                    ) : (
                      'Edit'
                    )}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={localProfile.display_name}
                      onChange={(e) => setLocalProfile(prev => ({
                        ...prev,
                        display_name: e.target.value.slice(0, 100)
                      }))}
                      disabled={!isEditing}
                      className="mt-1"
                      placeholder="Enter your name"
                      maxLength={100}
                      autoFocus={isEditing}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="mt-1 bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={localProfile.phone}
                      onChange={(e) => {
                        const sanitized = sanitizePhone(e.target.value);
                        setLocalProfile(prev => ({ ...prev, phone: sanitized }));
                        if (phoneError) setPhoneError('');
                      }}
                      disabled={!isEditing}
                      className={`mt-1 ${phoneError ? 'border-destructive' : ''}`}
                      placeholder="+1 234 567 8900"
                      maxLength={20}
                    />
                    {phoneError && (
                      <p className="text-xs text-destructive mt-1">{phoneError}</p>
                    )}
                  </div>
                </div>

                {/* Change Password Section */}
                <div className="pt-4 border-t border-border">
                  <button
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">Change Password</p>
                        <p className="text-sm text-muted-foreground">Update your password</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${showPasswordChange ? 'rotate-90' : ''}`} />
                  </button>

                  {showPasswordChange && (
                    <motion.div
                      className="mt-4 space-y-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwords.new}
                          onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                          className="mt-1"
                          placeholder="Enter new password"
                          minLength={6}
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwords.confirm}
                          onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                          className="mt-1"
                          placeholder="Confirm new password"
                          minLength={6}
                        />
                      </div>
                      <Button
                        onClick={handleChangePassword}
                        disabled={passwordLoading || !passwords.new || !passwords.confirm}
                        className="w-full"
                      >
                        {passwordLoading ? 'Updating...' : 'Update Password'}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="p-4 space-y-4">
                <h3 className="font-semibold text-foreground mb-4">App Preferences</h3>

                {/* Theme Selection */}
                <div className="p-4 bg-muted rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg">
                      {preferences.themePreference === 'dark' ? (
                        <Moon className="w-5 h-5 text-foreground" />
                      ) : preferences.themePreference === 'light' ? (
                        <Sun className="w-5 h-5 text-foreground" />
                      ) : (
                        <Monitor className="w-5 h-5 text-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Theme</p>
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
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">Currency</p>
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
                            <span className="font-mono">{symbol}</span>
                            <span>{name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Format */}
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">Date Format</p>
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
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">Week Starts On</p>
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
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="p-4 space-y-4">
                <h3 className="font-semibold text-foreground mb-4">Notification Settings</h3>

                {/* Budget Alerts */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Budget Alerts</p>
                      <p className="text-sm text-muted-foreground">Notify when approaching budget limit</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.budgetAlerts}
                    onCheckedChange={(checked) => handleSavePreferences({ budgetAlerts: checked })}
                  />
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg">
                      <Bell className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => handleSavePreferences({ emailNotifications: checked })}
                  />
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg">
                      <Bell className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Browser push notifications</p>
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
              </TabsContent>

              {/* Data Management Tab */}
              <TabsContent value="data" className="p-4 space-y-4">
                <h3 className="font-semibold text-foreground mb-4">Data Management</h3>

                {/* Export Data */}
                <button
                  onClick={handleExportAllData}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg">
                      <Download className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Export All Data</p>
                      <p className="text-sm text-muted-foreground">Download all your data as JSON</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Help & Support */}
                <button className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-lg">
                      <HelpCircle className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Help & Support</p>
                      <p className="text-sm text-muted-foreground">Get help from our team</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Delete Account */}
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full flex items-center justify-between p-4 bg-destructive/10 rounded-xl hover:bg-destructive/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/20 rounded-lg">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-destructive">Delete Account</p>
                      <p className="text-sm text-destructive/70">Permanently delete all your data</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-destructive" />
                </button>

                {/* Sign Out Button */}
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full mt-6 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Sign Out
                </Button>
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>
      </div>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>This action cannot be undone. This will permanently delete all your:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Transactions and expense history</li>
                <li>Budgets and spending plans</li>
                <li>Cards and payment methods</li>
                <li>Savings goals</li>
                <li>Payment reminders</li>
              </ul>
              <div className="pt-4">
                <Label htmlFor="deleteConfirm" className="text-foreground">
                  Type <strong>DELETE</strong> to confirm
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  className="mt-2"
                  placeholder="DELETE"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation
        onAddTransaction={() => navigate('/')}
      />
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        source="profile_page"
      />
    </div>
  );
}
