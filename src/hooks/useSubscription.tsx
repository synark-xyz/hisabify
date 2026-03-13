import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { resolvePremiumAccess } from '@/lib/subscription';

export function useSubscription() {
    const { profile, loading } = useProfile();
    const { user } = useAuth();
    const { data: appConfig, isLoading: appConfigLoading } = useQuery({
        queryKey: ['app-config', 'subscription-gating'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('app_config')
                .select('disable_subscription_gating')
                .eq('id', 'global')
                .maybeSingle();

            if (error) {
                throw error;
            }

            return {
                disable_subscription_gating: data?.disable_subscription_gating ?? false,
            };
        },
        staleTime: 60_000,
    });

    // specific override for sam103043
    const isSpecialUser = user?.email === 'sam103043@gmail.com';

    return {
        isPremium: resolvePremiumAccess({
            disableSubscriptionGating: appConfig?.disable_subscription_gating ?? false,
            subscriptionType: profile.subscription_type,
            subscriptionStatus: profile.subscription_status,
            referralGrantedUntil: profile.referral_granted_until,
            proAccessOverride: profile.pro_access_override,
            isSpecialUser,
        }),
        loading: loading || appConfigLoading
    };
}
