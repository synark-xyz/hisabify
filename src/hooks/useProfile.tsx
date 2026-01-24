import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface User {
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  currency: string;
  subscription_type: 'base' | 'pro';
  subscription_status: string;
}

interface ProfileContextType {
  profile: User;
  setProfile: (profile: User) => void;
  updateAvatar: (url: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<User>({
    display_name: null,
    phone: null,
    avatar_url: null,
    currency: 'USD',
    subscription_type: 'base',
    subscription_status: 'inactive',
  });

  const refreshProfile = async () => {
    if (!user) {
      setProfile({
        display_name: null,
        phone: null,
        avatar_url: null,
        currency: 'USD',
        subscription_type: 'base',
        subscription_status: 'inactive',
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile({
        display_name: data.display_name,
        phone: data.phone,
        avatar_url: data.avatar_url,
        currency: data.currency || 'USD',
        subscription_type: data.subscription_type || 'base',
        subscription_status: data.subscription_status || 'inactive',
      });
    }
    setLoading(false);
  };

  const updateAvatar = async (url: string) => {
    if (!user) return;

    await supabase
      .from('users')
      .upsert({ user_id: user.id, avatar_url: url }, { onConflict: 'user_id' });

    setProfile(prev => ({ ...prev, avatar_url: url }));
  };

  useEffect(() => {
    refreshProfile();
  }, [user]);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, updateAvatar, refreshProfile, loading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
