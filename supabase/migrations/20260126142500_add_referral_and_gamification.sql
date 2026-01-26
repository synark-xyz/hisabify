-- Migration: Add Referral and Gamification fields to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referral_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(user_id),
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- Function to generate a random referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  exists_code BOOLEAN;
BEGIN
  LOOP
    -- Generate a 6-character uppercase alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if it exists
    SELECT EXISTS (SELECT 1 FROM public.users WHERE referral_code = new_code) INTO exists_code;
    
    -- Exit loop if unique
    IF NOT exists_code THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update existing users with referral codes if they don't have one
UPDATE public.users SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

-- Update handle_new_user to include referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (user_id, display_name, referral_code)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name', public.generate_referral_code());
  RETURN new;
END;
$$;
