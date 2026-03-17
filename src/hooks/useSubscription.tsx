import { useCallback } from 'react';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export function useSubscription() {
    const { profile, loading } = useProfile();
    const { user } = useAuth();

    // specific override for sam103043
    const isSpecialUser = user?.email === 'sam103043@gmail.com';

    // Time-based referral Pro access check
    const hasActiveReferralGrant = profile.referral_granted_until
        ? new Date(profile.referral_granted_until) > new Date()
        : false;

    /**
     * Initiates a Stripe Checkout session for the given plan.
     * On success, redirects the browser to the Stripe-hosted checkout page.
     * Throws an error if the Edge Function call fails.
     */
    const createCheckoutSession = useCallback(async (plan: 'monthly' | 'yearly'): Promise<void> => {
        if (!user) {
            throw new Error('You must be signed in to upgrade.');
        }

        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: {
                plan,
                success_url: `${window.location.origin}/?checkout=success`,
                cancel_url: `${window.location.origin}/?checkout=cancelled`,
            },
        });

        if (error) {
            logger.error('Checkout session error', { error: error.message });
            throw new Error(error.message || 'Failed to create checkout session');
        }

        const result = data as { url?: string; error?: string };

        if (result.error) {
            throw new Error(result.error);
        }

        if (!result.url) {
            throw new Error('No checkout URL returned');
        }

        // Redirect to Stripe Checkout
        window.location.href = result.url;
    }, [user]);

    return {
        isPremium: (
            (profile.subscription_type === 'pro' && profile.subscription_status === 'active') ||
            hasActiveReferralGrant ||
            isSpecialUser
        ),
        loading,
        createCheckoutSession,
    };
}
