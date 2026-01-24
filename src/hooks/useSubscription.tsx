import { useProfile } from './useProfile';

export function useSubscription() {
    const { profile, loading } = useProfile();

    return {
        isPremium: profile.subscription_type === 'pro' && profile.subscription_status === 'active',
        loading
    };
}
