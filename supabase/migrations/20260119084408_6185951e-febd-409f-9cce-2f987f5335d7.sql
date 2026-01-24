-- Add user preferences columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS week_start_day text NOT NULL DEFAULT 'monday',
ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'system',
ADD COLUMN IF NOT EXISTS budget_alerts_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean NOT NULL DEFAULT false;