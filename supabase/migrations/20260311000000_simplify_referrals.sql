-- Migration: Simplify Referral System
-- Context: Replace lifetime credit accumulation with time-based Pro grants
-- Changes:
-- 1. Add time-based columns (referral_used_at, referral_granted_until)
-- 2. Migrate existing credits to time grants
-- 3. Update referral codes to 8-char format (UUID substring)
-- 4. Create atomic redeem_referral_code() RPC
-- 5. Drop old functions (reward_referral, generate_referral_code)

-- Step 1: Add new columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS referral_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS referral_granted_until TIMESTAMPTZ;

-- Step 2: Migrate existing credits to time grants
-- Users with credits get 30 days per credit, starting from now
UPDATE public.users
SET referral_granted_until = now() + (referral_credits * INTERVAL '30 days')
WHERE referral_credits > 0;

-- Step 3: Update referral codes to 8-char UUID substring format
-- This is deterministic based on user_id, no collisions possible
UPDATE public.users
SET referral_code = upper(substring(replace(user_id::text, '-', '') from 1 for 8))
WHERE referral_code IS NOT NULL;

-- Step 4: Update handle_new_user to use new 8-char format
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (user_id, display_name, referral_code)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    upper(substring(replace(new.id::text, '-', '') from 1 for 8))
  );
  RETURN new;
END;
$$;

-- Step 5: Create new atomic redeem_referral_code RPC
-- This function handles all validation and updates in a single transaction
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
  v_invitee_granted_until TIMESTAMPTZ;
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

  -- All validations passed: Execute atomic updates

  -- Update invitee: set referred_by, referral_used_at, grant 30 days Pro
  UPDATE public.users
  SET
    referred_by = v_referrer_id,
    referral_used_at = now(),
    referral_granted_until = now() + INTERVAL '30 days'
  WHERE user_id = p_invitee_id;

  -- Update referrer: extend Pro access by 30 days (stacking logic)
  SELECT referral_granted_until INTO v_referrer_granted_until
  FROM public.users
  WHERE user_id = v_referrer_id;

  IF v_referrer_granted_until IS NULL OR v_referrer_granted_until < now() THEN
    -- No existing grant or expired: start new 30-day period from now
    UPDATE public.users
    SET referral_granted_until = now() + INTERVAL '30 days'
    WHERE user_id = v_referrer_id;
  ELSE
    -- Active grant: stack by extending existing expiry
    UPDATE public.users
    SET referral_granted_until = referral_granted_until + INTERVAL '30 days'
    WHERE user_id = v_referrer_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Step 6: Drop old functions (keep after new RPC is tested)
DROP FUNCTION IF EXISTS public.reward_referral(UUID, UUID);
DROP FUNCTION IF EXISTS public.generate_referral_code();

-- Step 7: Add index for performance (query by referral_granted_until)
CREATE INDEX IF NOT EXISTS idx_users_referral_granted_until
ON public.users(referral_granted_until)
WHERE referral_granted_until IS NOT NULL;

-- Note: referral_credits column is kept temporarily for rollback safety
-- Can be dropped after 1 week if no issues:
-- ALTER TABLE public.users DROP COLUMN IF EXISTS referral_credits;
