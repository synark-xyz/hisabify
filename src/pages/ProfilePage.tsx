import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Settings, Shield, HelpCircle, ChevronRight, 
  Camera, Save, LogOut, Moon, Sun, Check, ChevronLeft
} from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    phone: '',
    avatar_url: null,
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile({
        display_name: data.display_name,
        phone: data.phone,
        avatar_url: data.avatar_url,
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        display_name: profile.display_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
      }, { onConflict: 'user_id' });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated successfully' });
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

    setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
    
    await supabase
      .from('profiles')
      .upsert({ user_id: user.id, avatar_url: publicUrl }, { onConflict: 'user_id' });

    toast({ title: 'Avatar updated' });
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out successfully' });
    navigate('/auth');
  };

  const menuItems = [
    { id: 'personal', icon: User, label: 'Personal Info' },
    { id: 'security', icon: Shield, label: 'Security' },
    { id: 'help', icon: HelpCircle, label: 'Help & Support' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        <Header title="Profile" />

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
            <h2 className="text-xl font-bold text-foreground mt-4">
              {profile.display_name || user?.email?.split('@')[0]}
            </h2>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </motion.div>

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
                    <span className="text-[10px]">{item.label.split(' ')[0]}</span>
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
                      value={profile.display_name || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
                      disabled={!isEditing}
                      className="mt-1"
                      placeholder="Enter your name"
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
                      value={profile.phone || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      className="mt-1"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="p-4 space-y-4">
                <h3 className="font-semibold text-foreground mb-4">Security Settings</h3>
                
                <button className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">Change Password</p>
                    <p className="text-sm text-muted-foreground">Update your password</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add extra security</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">Active Sessions</p>
                    <p className="text-sm text-muted-foreground">Manage logged in devices</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </TabsContent>

              {/* Help Tab */}
              <TabsContent value="help" className="p-4 space-y-4">
                <h3 className="font-semibold text-foreground mb-4">Help & Support</h3>
                
                <button className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">FAQ</p>
                    <p className="text-sm text-muted-foreground">Frequently asked questions</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">Contact Support</p>
                    <p className="text-sm text-muted-foreground">Get help from our team</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">Privacy Policy</p>
                    <p className="text-sm text-muted-foreground">Read our privacy policy</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">Terms of Service</p>
                    <p className="text-sm text-muted-foreground">Read our terms</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="p-4 space-y-4">
                <h3 className="font-semibold text-foreground mb-4">App Settings</h3>

                {/* Theme Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: theme === 'dark' ? 0 : 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      {theme === 'dark' ? (
                        <Moon className="w-5 h-5 text-foreground" />
                      ) : (
                        <Sun className="w-5 h-5 text-foreground" />
                      )}
                    </motion.div>
                    <div>
                      <p className="font-medium text-foreground">Dark Mode</p>
                      <p className="text-sm text-muted-foreground">
                        {theme === 'dark' ? 'Dark theme active' : 'Light theme active'}
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={theme === 'dark'} 
                    onCheckedChange={toggleTheme}
                    className="data-[state=checked]:bg-accent"
                  />
                </div>

                {/* Currency Selector */}
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Currency</p>
                      <p className="text-sm text-muted-foreground">Select your preferred currency</p>
                    </div>
                  </div>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="mt-3">
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

      <BottomNavigation onAddClick={() => navigate('/expenses')} />
    </div>
  );
}
