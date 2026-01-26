import { useProfile } from './useProfile';
import { useAuth } from './useAuth';

export function useSubscription() {
    const { profile, loading } = useProfile();
    const { user } = useAuth();

    // specific override for sam103043
    const isSpecialUser = user?.email === 'sam103043@gmail.com';

    return {
        isPremium: (profile.subscription_type === 'pro' && profile.subscription_status === 'active') || profile.referral_credits > 0 || isSpecialUser,
        loading
    };
}
