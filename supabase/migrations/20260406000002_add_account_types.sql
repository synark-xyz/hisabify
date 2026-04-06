-- Create account_types table for transfer functionality
CREATE TABLE public.account_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#7C3AED',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_types ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view their own account types
CREATE POLICY "Users can view their own account types"
ON public.account_types FOR SELECT
USING (auth.uid() = user_id);

-- RLS policy: users can insert their own account types
CREATE POLICY "Users can insert their own account types"
ON public.account_types FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS policy: users can update their own account types
CREATE POLICY "Users can update their own account types"
ON public.account_types FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policy: users can delete their own account types
CREATE POLICY "Users can delete their own account types"
ON public.account_types FOR DELETE
USING (auth.uid() = user_id);

-- Add account_type_id column to cards table
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS account_type_id UUID REFERENCES public.account_types(id) ON DELETE SET NULL;

-- Insert default 'Personal' account type for existing users
INSERT INTO public.account_types (user_id, name, color)
SELECT id, 'Personal', '#7C3AED'
FROM auth.users
WHERE id NOT IN (SELECT DISTINCT user_id FROM public.account_types);

-- Set default account_type_id for existing cards to the user's Personal account
UPDATE public.cards
SET account_type_id = (
  SELECT id FROM public.account_types 
  WHERE user_id = cards.user_id AND name = 'Personal'
  LIMIT 1
)
WHERE account_type_id IS NULL;
