import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

const PENDING_REFERRAL_KEY = 'pendingReferralCode';

export function useReferral() {
    const { user } = useAuth();
    const { profile, refreshProfile } = useProfile();
    const [loading, setLoading] = useState(false);

    const redeemCode = useCallback(async (code: string): Promise<boolean> => {
        if (!user) return false;
        setLoading(true);

        try {
            // Call atomic RPC function that handles all validation and updates
            const { data, error } = await supabase.rpc('redeem_referral_code', {
                p_referral_code: code.toUpperCase(),
                p_invitee_id: user.id
            });

            if (error) {
                console.error('RPC error:', error);
                toast.error('Failed to redeem code');
                return false;
            }

            // Parse RPC response
            const result = data as { success: boolean; error?: string };

            if (!result.success) {
                toast.error(result.error || 'Failed to redeem code');
                return false;
            }

            // Clear pending referral code from localStorage on successful redemption
            localStorage.removeItem(PENDING_REFERRAL_KEY);

            toast.success('Referral code redeemed! You both get 30 days of Pro features.');
            await refreshProfile();
            return true;
        } catch (err) {
            console.error('Error redeeming code:', err);
            toast.error('Failed to redeem code');
            return false;
        } finally {
            setLoading(false);
        }
    }, [user, refreshProfile]);

    // Auto-redeem pending referral code after user signs up
    useEffect(() => {
        if (!user) return;

        const hasUsedReferral = !!profile.referred_by || !!profile.referral_used_at;
        if (hasUsedReferral) {
            // Already used a code — clean up any stale pending code
            localStorage.removeItem(PENDING_REFERRAL_KEY);
            return;
        }

        const pendingCode = localStorage.getItem(PENDING_REFERRAL_KEY);
        if (!pendingCode) return;

        // Attempt auto-redemption of the pending code
        void redeemCode(pendingCode);
    }, [user, profile.referred_by, profile.referral_used_at, redeemCode]);

    // Calculate days remaining for referral Pro access
    const daysRemaining = profile.referral_granted_until
        ? Math.max(0, Math.ceil((new Date(profile.referral_granted_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    const hasUsedReferral = !!profile.referred_by || !!profile.referral_used_at;

    return {
        referralCode: profile.referral_code,
        daysRemaining,
        hasUsedReferral,
        redeemCode,
        loading,
    };
}
