-- Add system category flag and type to categories table
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS is_system_category BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS category_type TEXT;

-- Create system categories
INSERT INTO public.categories (name, icon, color, is_system_category, category_type)
VALUES
  ('Credit Card Payments', 'credit-card', '#6366F1', TRUE, 'credit_card'),
  ('Utility Bills', 'zap', '#F59E0B', TRUE, 'utility'),
  ('Lent Money', 'hand-coins', '#10B981', TRUE, 'lend'),
  ('Borrowed Money', 'landmark', '#EF4444', TRUE, 'owe'),
  ('Other Payments', 'circle-dot', '#6B7280', TRUE, 'other')
ON CONFLICT DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_categories_system
ON public.categories(is_system_category, category_type);
