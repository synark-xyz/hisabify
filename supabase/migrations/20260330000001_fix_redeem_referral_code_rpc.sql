-- Fix: Apply all referral columns and RPC to remote
-- Root cause: referral migrations (20260126142500, 20260311000000) were never applied to remote.
-- This migration is idempotent and safe to run regardless of prior migration state.

-- Add all referral-related columns (covers both missing migrations)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_credits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(user_id),
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS referral_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_granted_until TIMESTAMPTZ;

-- Backfill referral codes for existing users that don't have one
UPDATE public.users
SET referral_code = upper(substring(replace(user_id::text, '-', '') from 1 for 8))
WHERE referral_code IS NULL;

-- Update handle_new_user trigger to use 8-char UUID referral code format
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (user_id, email, display_name, referral_code, privacy_policy_accepted)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'display_name',
    upper(substring(replace(new.id::text, '-', '') from 1 for 8)),
    COALESCE((new.raw_user_meta_data ->> 'privacy_policy_accepted')::boolean, false)
  );
  RETURN new;
END;
$$;

-- Ensure performance index exists
CREATE INDEX IF NOT EXISTS idx_users_referral_granted_until
  ON public.users(referral_granted_until)
  WHERE referral_granted_until IS NOT NULL;

-- Re-create the RPC (idempotent via OR REPLACE)
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

  -- All validations passed: grant invitee 30 days Pro
  UPDATE public.users
  SET
    referred_by = v_referrer_id,
    referral_used_at = now(),
    referral_granted_until = now() + INTERVAL '30 days'
  WHERE user_id = p_invitee_id;

  -- Grant referrer 30 days Pro (stacking if already active)
  SELECT referral_granted_until INTO v_referrer_granted_until
  FROM public.users
  WHERE user_id = v_referrer_id;

  IF v_referrer_granted_until IS NULL OR v_referrer_granted_until < now() THEN
    UPDATE public.users
    SET referral_granted_until = now() + INTERVAL '30 days'
    WHERE user_id = v_referrer_id;
  ELSE
    UPDATE public.users
    SET referral_granted_until = referral_granted_until + INTERVAL '30 days'
    WHERE user_id = v_referrer_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
