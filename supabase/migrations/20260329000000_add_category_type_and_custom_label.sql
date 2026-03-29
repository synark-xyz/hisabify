-- Add type column to categories table
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'expense'
  CHECK (type IN ('expense', 'income'));

-- Backfill income categories
UPDATE public.categories SET type = 'income' WHERE name IN ('Salary');
-- All other existing categories default to 'expense' via the DEFAULT above

-- Add custom_category_label to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS custom_category_label TEXT;
