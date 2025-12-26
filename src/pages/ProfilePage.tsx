import { LogOut, Settings, User, CreditCard, Bell, Shield, HelpCircle, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/use-toast';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out successfully' });
    navigate('/auth');
  };

  const menuItems = [
    { icon: User, label: 'Personal Info', path: '#' },
    { icon: CreditCard, label: 'Payment Methods', path: '/cards' },
    { icon: Bell, label: 'Notifications', path: '#' },
    { icon: Shield, label: 'Security', path: '#' },
    { icon: HelpCircle, label: 'Help & Support', path: '#' },
    { icon: Settings, label: 'Settings', path: '#' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto">
        <Header title="Profile" />

        <main className="px-4 space-y-6">
          {/* Profile Card */}
          <motion.div 
            className="bg-card rounded-2xl p-6 shadow-card text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Avatar className="w-20 h-20 mx-auto mb-4 ring-4 ring-accent ring-offset-4 ring-offset-background">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold text-foreground mb-1">
              {user?.email?.split('@')[0]}
            </h2>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </motion.div>

          {/* Dark Mode Toggle */}
          <motion.div 
            className="bg-card rounded-2xl shadow-card overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
                  animate={{ rotate: theme === 'dark' ? 0 : 180 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                  <AnimatePresence mode="wait">
                    {theme === 'dark' ? (
                      <motion.div
                        key="moon"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Moon className="w-5 h-5 text-foreground" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="sun"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Sun className="w-5 h-5 text-foreground" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                <div>
                  <span className="font-medium text-foreground">Dark Mode</span>
                  <p className="text-xs text-muted-foreground">
                    {theme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
                  </p>
                </div>
              </div>
              <Switch 
                checked={theme === 'dark'} 
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-accent"
              />
            </div>
          </motion.div>

          {/* Menu Items */}
          <motion.div 
            className="bg-card rounded-2xl shadow-card overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {menuItems.map((item, index) => (
              <motion.button
                key={index}
                onClick={() => item.path !== '#' && navigate(item.path)}
                className="w-full flex items-center gap-4 p-4 hover:bg-muted transition-colors border-b border-border last:border-0"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-foreground" />
                </div>
                <span className="font-medium text-foreground">{item.label}</span>
              </motion.button>
            ))}
          </motion.div>

          {/* Sign Out */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out
            </Button>
          </motion.div>
        </main>
      </div>

      <BottomNavigation onAddClick={() => navigate('/expenses')} />
    </div>
  );
}
