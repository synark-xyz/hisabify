import { useProfile } from './useProfile';
import { useAuth } from './useAuth';

export function useSubscription() {
    const { profile, loading } = useProfile();
    const { user } = useAuth();

    // specific override for sam103043
    const isSpecialUser = user?.email === 'sam103043@gmail.com';

    // Time-based referral Pro access check
    const hasActiveReferralGrant = profile.referral_granted_until
        ? new Date(profile.referral_granted_until) > new Date()
        : false;

    return {
        isPremium: (
            (profile.subscription_type === 'pro' && profile.subscription_status === 'active') ||
            hasActiveReferralGrant ||
            isSpecialUser
        ),
        loading
    };
}
