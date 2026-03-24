-- Fix handle_new_user: restores inline UUID referral code (generate_referral_code was dropped
-- by simplify_referrals migration) while keeping email + privacy_policy_accepted fields
-- added by add_email_to_users migration.
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

-- Ensure the column exists (idempotent if already present)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Backfill referral_code for any existing users where it is NULL
UPDATE public.users
SET referral_code = upper(substring(replace(user_id::text, '-', '') from 1 for 8))
WHERE referral_code IS NULL;
