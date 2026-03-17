-- Add email column to public.users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing rows from auth.users
UPDATE public.users u
SET email = a.email
FROM auth.users a
WHERE u.user_id = a.id
  AND u.email IS NULL;

-- Update handle_new_user trigger to also copy email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (user_id, email, display_name, referral_code, privacy_policy_accepted)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'display_name',
    public.generate_referral_code(),
    COALESCE((new.raw_user_meta_data ->> 'privacy_policy_accepted')::boolean, false)
  );
  RETURN new;
END;
$$;
