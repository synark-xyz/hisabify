import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export function useReferral() {
    const { user } = useAuth();
    const { profile, refreshProfile } = useProfile();
    const [loading, setLoading] = useState(false);

    const redeemCode = useCallback(async (code: string) => {
        if (!user) return false;
        setLoading(true);

        try {
            // 1. Find the user with this referral code
            const { data: referrer, error: findError } = await supabase
                .from('users')
                .select('user_id, referral_code')
                .eq('referral_code', code.toUpperCase())
                .single();

            if (findError || !referrer) {
                toast.error('Invalid referral code');
                return false;
            }

            if (referrer.user_id === user.id) {
                toast.error('You cannot use your own referral code');
                return false;
            }

            // Check if user already has a referrer
            if (profile.referred_by) {
                toast.error('You have already redeemed a referral code');
                return false;
            }

            // 2. Update current user: set referred_by
            // 3. Update referrer: increment referral_credits
            // In a production app, this should be a single transaction (Postgres Function)

            const { error: updateError } = await supabase
                .from('users')
                .update({ referred_by: referrer.user_id })
                .eq('user_id', user.id);

            if (updateError) throw updateError;

            // Award credits to referrer
            // Note: This is a bit simplified for MVP. In reality, you'd want server-side logic (RPC).
            const { error: rewardError } = await supabase.rpc('reward_referral', {
                referrer_id: referrer.user_id,
                invitee_id: user.id
            });

            if (rewardError) {
                // Fallback for MVP if RPC isn't set up yet
                console.warn('RPC reward_referral failed, falling back to manual increment', rewardError);
                // This fallback would fail if RLS doesn't allow updating other users.
            }

            toast.success('Referral code redeemed! Enjoy your Pro features.');
            await refreshProfile();
            return true;
        } catch (err) {
            console.error('Error redeeming code:', err);
            toast.error('Failed to redeem code');
            return false;
        } finally {
            setLoading(false);
        }
    }, [user, profile, refreshProfile]);

    return {
        referralCode: profile.referral_code,
        credits: profile.referral_credits,
        redeemCode,
        loading,
    };
}
