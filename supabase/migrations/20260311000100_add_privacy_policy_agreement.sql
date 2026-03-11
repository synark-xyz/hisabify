-- Add a persisted privacy policy agreement flag to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS privacy_policy_accepted BOOLEAN NOT NULL DEFAULT false;
