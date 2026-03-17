import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { clearProfileMemory, readProfileFromMemory, writeProfileToMemory } from '@/lib/profile-memory';

interface User {
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  currency: string;
  subscription_type: 'base' | 'pro';
  subscription_status: string;
  referral_code: string | null;
  referral_credits: number;
  referred_by: string | null;
  referral_used_at: string | null;
  referral_granted_until: string | null;
  last_active_at: string | null;
  privacy_policy_accepted: boolean;
}

const defaultProfile: User = {
  display_name: null,
  phone: null,
  avatar_url: null,
  currency: 'USD',
  subscription_type: 'base',
  subscription_status: 'inactive',
  referral_code: null,
  referral_credits: 0,
  referred_by: null,
  referral_used_at: null,
  referral_granted_until: null,
  last_active_at: null,
  privacy_policy_accepted: false,
};

function mapUserRowToProfile(data: Record<string, unknown>): User {
  return {
    display_name: (data.display_name as string | null) || null,
    phone: (data.phone as string | null) || null,
    avatar_url: (data.avatar_url as string | null) || null,
    currency: (data.currency as string | null) || 'USD',
    subscription_type: ((data.subscription_type as 'base' | 'pro' | null) || 'base'),
    subscription_status: (data.subscription_status as string | null) || 'inactive',
    referral_code: (data.referral_code as string | null) || null,
    referral_credits: (data.referral_credits as number | null) || 0,
    referred_by: (data.referred_by as string | null) || null,
    referral_used_at: (data.referral_used_at as string | null) || null,
    referral_granted_until: (data.referral_granted_until as string | null) || null,
    last_active_at: (data.last_active_at as string | null) || null,
    privacy_policy_accepted: (data.privacy_policy_accepted as boolean | null) ?? false,
  };
}

interface ProfileContextType {
  profile: User;
  setProfile: (profile: User) => void;
  updateAvatar: (url: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [profile, setProfileState] = useState<User>({ ...defaultProfile });

  const setProfile = useCallback((nextProfile: User) => {
    setProfileState(nextProfile);
    if (user) {
      writeProfileToMemory(user.id, nextProfile);
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfileState({ ...defaultProfile });
      clearProfileMemory();
      setLoading(false);
      return;
    }

    const cached = readProfileFromMemory<User>(user.id);
    if (cached) {
      setProfile(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      const nextProfile = mapUserRowToProfile(data as Record<string, unknown>);
      setProfileState(nextProfile);
      writeProfileToMemory(user.id, nextProfile);
    }
    setLoading(false);
  }, [user, setProfile]);

  const updateAvatar = async (url: string) => {
    if (!user) return;

    await supabase
      .from('users')
      .upsert({ user_id: user.id, avatar_url: url }, { onConflict: 'user_id' });

    setProfileState(prev => {
      const nextProfile = { ...prev, avatar_url: url };
      writeProfileToMemory(user.id, nextProfile);
      return nextProfile;
    });
  };

  const togglePrivacyMode = () => {
    setPrivacyMode(prev => !prev);
  };

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const statusTriggerSet = new Set(['cancelled', 'canceled', 'expired']);

    const channel = supabase
      .channel(`profile-subscription-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const next = payload.new as Record<string, unknown>;
          const prev = payload.old as Record<string, unknown>;
          const nextStatus = String(next.subscription_status || '').toLowerCase();
          const prevStatus = String(prev.subscription_status || '').toLowerCase();

          if (!statusTriggerSet.has(nextStatus) || nextStatus === prevStatus) {
            return;
          }

          const nextProfile = mapUserRowToProfile(next);
          setProfileState(nextProfile);
          writeProfileToMemory(user.id, nextProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, updateAvatar, refreshProfile, loading, privacyMode, togglePrivacyMode }}>
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
