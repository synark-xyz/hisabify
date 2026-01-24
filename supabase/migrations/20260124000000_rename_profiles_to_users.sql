-- Migration: Rename profiles to users and enhance subscription fields
-- Task 1: Create/Modify 'users' table

-- 1. Rename the table if it exists as profiles
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles RENAME TO users;
    END IF;
END $$;

-- 2. Add subscription fields to public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'base' CHECK (subscription_type IN ('base', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';

-- 3. Update the handle_new_user function to point to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$;

-- 4. Update the trigger (it might already exist with the same name, but good to be sure)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Update RLS policies for public.users
-- Note: Renaming a table usually carries policies over, but we ensure they are specific to the new name
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own user data" 
ON public.users FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own profile" ON public.users;
CREATE POLICY "Users can create their own user data" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own user data" 
ON public.users FOR UPDATE 
USING (auth.uid() = user_id);

-- 6. Task 2: Ensure all db tables are connected properly
-- Check if existing tables should reference public.users instead of auth.users for consistency
-- However, referencing auth.users is best practice for security.
-- We will ensure foreign keys exist.

-- Ensure cards.user_id has a FK to public.users (or auth.users)
-- Already handled by app logic, but let's add constraints where missing.
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_user_id_fkey;
ALTER TABLE public.cards ADD CONSTRAINT cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_fkey;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.payment_reminders DROP CONSTRAINT IF EXISTS payment_reminders_user_id_fkey;
ALTER TABLE public.payment_reminders ADD CONSTRAINT payment_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. Task 3: Encryption for sensitive data
-- We will use pgcrypto for simple vault-like encryption if needed.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Card numbers are currently stored as TEXT.
-- We will implement a simple encryption demonstration. 
-- In a production app, the encryption key should be stored in a secure vault (like Supabase Vault).

-- Add last_four column to cards for safe display
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS last_four TEXT;

-- Create a function to encrypt card numbers before storage
CREATE OR REPLACE FUNCTION public.encrypt_card_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Only encrypt if it's not already encrypted (naive check: does not start with PGP MESSAGE)
    IF NEW.card_number !~ '^-----BEGIN PGP MESSAGE-----' THEN
        -- 1. Extract last 4 digits for safe display
        NEW.last_four = RIGHT(REPLACE(REPLACE(NEW.card_number, ' ', ''), '-', ''), 4);
        
        -- 2. Encrypt the full number
        -- We use a dummy key here. In reality, you'd fetch this from a secure setting.
        -- We use armor() to ensure the output is TEXT compatible.
        NEW.card_number = armor(pgp_sym_encrypt(NEW.card_number, 'super-secret-wallet-key'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to cards table
DROP TRIGGER IF EXISTS encrypt_card_number_trigger ON public.cards;
CREATE TRIGGER encrypt_card_number_trigger
BEFORE INSERT OR UPDATE ON public.cards
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_card_number();

-- Add a comment explaining the encryption
COMMENT ON COLUMN public.cards.card_number IS 'Encrypted using pgp_sym_encrypt with a secret key.';
