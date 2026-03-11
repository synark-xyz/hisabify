-- Persist privacy policy agreement from auth metadata during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (user_id, display_name, referral_code, privacy_policy_accepted)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    public.generate_referral_code(),
    COALESCE((new.raw_user_meta_data ->> 'privacy_policy_accepted')::boolean, false)
  );
  RETURN new;
END;
$$;
