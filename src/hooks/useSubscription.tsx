import { useProfile } from './useProfile';

export function useSubscription() {
    const { profile, loading } = useProfile();

    return {
        isPremium: profile.is_premium,
        loading
    };
}
