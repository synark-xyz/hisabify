-- Ensure all categories exist in the database
-- This migration is idempotent and safe to run multiple times

-- First, ensure the columns exist (in case system categories migration wasn't run)
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS is_system_category BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS category_type TEXT;

-- Insert default categories (will be skipped if they already exist)
INSERT INTO public.categories (name, icon, color, is_system_category, category_type)
VALUES
  ('Food And Drinks', 'utensils', '#F97316', FALSE, NULL),
  ('Shopping', 'shopping-bag', '#7C3AED', FALSE, NULL),
  ('Healthcare', 'heart-pulse', '#F97316', FALSE, NULL),
  ('Transportation', 'car', '#10B981', FALSE, NULL),
  ('Entertainment', 'gamepad-2', '#EC4899', FALSE, NULL),
  ('Bills', 'receipt', '#6366F1', FALSE, NULL),
  ('Salary', 'wallet', '#10B981', FALSE, NULL),
  ('Other', 'circle-dot', '#6B7280', FALSE, NULL)
ON CONFLICT (name) DO NOTHING;

-- Insert system categories (will be skipped if they already exist)
INSERT INTO public.categories (name, icon, color, is_system_category, category_type)
VALUES
  ('Credit Card Payments', 'credit-card', '#6366F1', TRUE, 'credit_card'),
  ('Utility Bills', 'zap', '#F59E0B', TRUE, 'utility'),
  ('Lent Money', 'hand-coins', '#10B981', TRUE, 'lend'),
  ('Borrowed Money', 'landmark', '#EF4444', TRUE, 'owe'),
  ('Other Payments', 'circle-dot', '#6B7280', TRUE, 'other')
ON CONFLICT (name) DO NOTHING;

-- Create index for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_categories_system
ON public.categories(is_system_category, category_type);

-- Verify RLS is enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Ensure the public read policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'categories'
    AND policyname = 'Categories are viewable by everyone'
  ) THEN
    CREATE POLICY "Categories are viewable by everyone"
    ON public.categories FOR SELECT
    USING (true);
  END IF;
END
$$;

-- Add a unique constraint on name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_name_key'
  ) THEN
    ALTER TABLE public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);
  END IF;
END
$$;
