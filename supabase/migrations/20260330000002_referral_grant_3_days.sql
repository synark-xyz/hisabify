-- Change referral Pro grant from 30 days to 3 days
CREATE OR REPLACE FUNCTION public.redeem_referral_code(
  p_referral_code TEXT,
  p_invitee_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_invitee_referred_by UUID;
  v_invitee_used_at TIMESTAMPTZ;
  v_referrer_granted_until TIMESTAMPTZ;
BEGIN
  -- Validation 1: Find referrer by code
  SELECT user_id INTO v_referrer_id
  FROM public.users
  WHERE referral_code = upper(p_referral_code);

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Validation 2: Self-referral check
  IF v_referrer_id = p_invitee_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot use your own referral code');
  END IF;

  -- Validation 3: Check if invitee already used a code
  SELECT referred_by, referral_used_at INTO v_invitee_referred_by, v_invitee_used_at
  FROM public.users
  WHERE user_id = p_invitee_id;

  IF v_invitee_referred_by IS NOT NULL OR v_invitee_used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already redeemed a referral code');
  END IF;

  -- All validations passed: grant invitee 3 days Pro
  UPDATE public.users
  SET
    referred_by = v_referrer_id,
    referral_used_at = now(),
    referral_granted_until = now() + INTERVAL '3 days'
  WHERE user_id = p_invitee_id;

  -- Grant referrer 3 days Pro (stacking if already active)
  SELECT referral_granted_until INTO v_referrer_granted_until
  FROM public.users
  WHERE user_id = v_referrer_id;

  IF v_referrer_granted_until IS NULL OR v_referrer_granted_until < now() THEN
    UPDATE public.users
    SET referral_granted_until = now() + INTERVAL '3 days'
    WHERE user_id = v_referrer_id;
  ELSE
    UPDATE public.users
    SET referral_granted_until = referral_granted_until + INTERVAL '3 days'
    WHERE user_id = v_referrer_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
