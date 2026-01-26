-- Migration: Add referral reward function
CREATE OR REPLACE FUNCTION public.reward_referral(referrer_id UUID, invitee_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment credits for referrer
  UPDATE public.users
  SET referral_credits = referral_credits + 1
  WHERE user_id = referrer_id;
  
  -- We could also award something to the invitee here if we wanted
END;
$$;
