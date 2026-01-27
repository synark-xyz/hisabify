import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/UpgradeModal';
import {
  User, ChevronRight, Database, Gift,
  Crown
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export function ProfilePage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const menuItems = [
    { id: 'personal', icon: User, label: 'Personal Information', path: '/profile/personal', color: 'bg-blue-500/10 text-blue-500' },
    // { id: 'invite', icon: Gift, label: 'Invite & Earn', path: '/profile/invite', color: 'bg-emerald-500/10 text-emerald-500' },
    // The user moved "Invite" to Profile, let's keep it here.
    { id: 'invite', icon: Gift, label: 'Invite & Earn', path: '/profile/invite', color: 'bg-pink-500/10 text-pink-500' },
    { id: 'data', icon: Database, label: 'Data Management', path: '/profile/data', color: 'bg-orange-500/10 text-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-transparent pb-page-content fade-bottom-overlay">
      <div className="max-w-md mx-auto">
        <main className="px-4 space-y-6 pt-4">
          {/* Profile Card */}
          <motion.div
            className="bg-card rounded-2xl p-6 shadow-card text-center relative pointer-events-none card-3d transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="relative inline-block">
              <Avatar className="w-24 h-24 mx-auto ring-4 ring-accent ring-offset-4 ring-offset-background icon-glow">
                <AvatarImage src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {profile.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <h2 className="text-xl font-bold text-foreground mt-4 flex items-center justify-center gap-2 text-glow">
              {profile.display_name || user?.email?.split('@')[0]}
              {(isPremium || profile.referral_credits > 0) && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[10px] font-black text-accent uppercase tracking-wider">
                  PRO
                </span>
              )}
            </h2>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </motion.div>

          {/* Premium Card Upsell */}
          {!subscriptionLoading && !isPremium && profile.referral_credits === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              onClick={() => setShowUpgradeModal(true)}
              className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-5 text-white shadow-xl shadow-purple-500/20 cursor-pointer relative overflow-hidden group border-glow"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400 icon-glow" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Support Development</span>
                  </div>
                  <h3 className="text-lg font-black text-glow">Go Premium</h3>
                  <p className="text-xs text-white/70 font-medium">Unlock all features & support the project</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-white" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Menu List */}
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {menuItems.map((item, idx) => (
              <motion.div
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors shadow-sm card-3d"
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${item.color}`}>
                    <item.icon className="w-5 h-5 icon-glow" />
                  </div>
                  <span className="font-semibold text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
              </motion.div>
            ))}
          </motion.div>

        </main>
      </div>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </div>
  );
}
