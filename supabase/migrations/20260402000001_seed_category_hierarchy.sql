-- Migration: 20260402000001_seed_category_hierarchy
-- Seeds the full category hierarchy: renames 2 parents, updates icons/colors,
-- inserts 11 new parent categories, and inserts 71 subcategories.

-- =============================================================================
-- Step 1: Rename existing parents (collision-guarded)
-- =============================================================================

-- Rename 'Bills' → 'Bills & Utilities' (guard against re-run)
UPDATE public.categories
  SET name = 'Bills & Utilities'
  WHERE name = 'Bills' AND parent_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Bills & Utilities');

-- Rename 'Salary' → 'Salary & Wages' (guard against re-run)
UPDATE public.categories
  SET name = 'Salary & Wages'
  WHERE name = 'Salary' AND parent_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Salary & Wages');

-- =============================================================================
-- Step 2: Update icon/color on all existing parents (idempotent UPDATEs)
-- =============================================================================

UPDATE public.categories SET icon = 'utensils',    color = '#F97316' WHERE name = 'Food And Drinks'   AND parent_id IS NULL;
UPDATE public.categories SET icon = 'shopping-bag', color = '#7C3AED' WHERE name = 'Shopping'          AND parent_id IS NULL;
UPDATE public.categories SET icon = 'heart-pulse',  color = '#EF4444' WHERE name = 'Healthcare'        AND parent_id IS NULL;
UPDATE public.categories SET icon = 'car',          color = '#10B981' WHERE name = 'Transportation'    AND parent_id IS NULL;
UPDATE public.categories SET icon = 'gamepad-2',    color = '#EC4899' WHERE name = 'Entertainment'     AND parent_id IS NULL;
UPDATE public.categories SET icon = 'receipt',      color = '#6366F1' WHERE name = 'Bills & Utilities' AND parent_id IS NULL;
UPDATE public.categories SET icon = 'circle-dot',   color = '#94A3B8' WHERE name = 'Other'             AND parent_id IS NULL;
UPDATE public.categories SET icon = 'wallet',       color = '#10B981' WHERE name = 'Salary & Wages'    AND parent_id IS NULL;

-- =============================================================================
-- Step 3: Insert new parent categories
-- =============================================================================

INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
VALUES
  ('Insurance',              'shield',       '#F59E0B', 'expense', FALSE, NULL),
  ('Personal Care',          'user',         '#8B5CF6', 'expense', FALSE, NULL),
  ('Family',                 'users',        '#06B6D4', 'expense', FALSE, NULL),
  ('Travel',                 'plane',        '#0EA5E9', 'expense', FALSE, NULL),
  ('Home & Office',          'home',         '#84CC16', 'expense', FALSE, NULL),
  ('Loans & Debt',           'landmark',     '#DC2626', 'expense', FALSE, NULL),
  ('Tax',                    'file-text',    '#6B7280', 'expense', FALSE, NULL),
  ('Freelance & Consulting', 'briefcase',    '#F97316', 'income',  FALSE, NULL),
  ('Business Income',        'building-2',   '#7C3AED', 'income',  FALSE, NULL),
  ('Investments',            'trending-up',  '#0EA5E9', 'income',  FALSE, NULL),
  ('Other Income',           'plus-circle',  '#6B7280', 'income',  FALSE, NULL)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- Step 4: Insert subcategories via DO block (resolves parent IDs dynamically)
-- =============================================================================

DO $$
DECLARE
  v_food_id       UUID;
  v_shopping_id   UUID;
  v_healthcare_id UUID;
  v_transport_id  UUID;
  v_entertain_id  UUID;
  v_bills_id      UUID;
  v_insurance_id  UUID;
  v_personal_id   UUID;
  v_family_id     UUID;
  v_travel_id     UUID;
  v_home_id       UUID;
  v_loans_id      UUID;
  v_tax_id        UUID;
  v_other_id      UUID;
  v_salary_id     UUID;
  v_freelance_id  UUID;
  v_business_id   UUID;
  v_invest_id     UUID;
  v_other_inc_id  UUID;
BEGIN
  -- Resolve parent IDs by name
  SELECT id INTO v_food_id       FROM public.categories WHERE name = 'Food And Drinks'        AND parent_id IS NULL;
  SELECT id INTO v_shopping_id   FROM public.categories WHERE name = 'Shopping'               AND parent_id IS NULL;
  SELECT id INTO v_healthcare_id FROM public.categories WHERE name = 'Healthcare'             AND parent_id IS NULL;
  SELECT id INTO v_transport_id  FROM public.categories WHERE name = 'Transportation'         AND parent_id IS NULL;
  SELECT id INTO v_entertain_id  FROM public.categories WHERE name = 'Entertainment'          AND parent_id IS NULL;
  SELECT id INTO v_bills_id      FROM public.categories WHERE name = 'Bills & Utilities'      AND parent_id IS NULL;
  SELECT id INTO v_insurance_id  FROM public.categories WHERE name = 'Insurance'              AND parent_id IS NULL;
  SELECT id INTO v_personal_id   FROM public.categories WHERE name = 'Personal Care'          AND parent_id IS NULL;
  SELECT id INTO v_family_id     FROM public.categories WHERE name = 'Family'                 AND parent_id IS NULL;
  SELECT id INTO v_travel_id     FROM public.categories WHERE name = 'Travel'                 AND parent_id IS NULL;
  SELECT id INTO v_home_id       FROM public.categories WHERE name = 'Home & Office'          AND parent_id IS NULL;
  SELECT id INTO v_loans_id      FROM public.categories WHERE name = 'Loans & Debt'           AND parent_id IS NULL;
  SELECT id INTO v_tax_id        FROM public.categories WHERE name = 'Tax'                    AND parent_id IS NULL;
  SELECT id INTO v_other_id      FROM public.categories WHERE name = 'Other'                  AND parent_id IS NULL;
  SELECT id INTO v_salary_id     FROM public.categories WHERE name = 'Salary & Wages'         AND parent_id IS NULL;
  SELECT id INTO v_freelance_id  FROM public.categories WHERE name = 'Freelance & Consulting' AND parent_id IS NULL;
  SELECT id INTO v_business_id   FROM public.categories WHERE name = 'Business Income'        AND parent_id IS NULL;
  SELECT id INTO v_invest_id     FROM public.categories WHERE name = 'Investments'            AND parent_id IS NULL;
  SELECT id INTO v_other_inc_id  FROM public.categories WHERE name = 'Other Income'           AND parent_id IS NULL;

  -- Food And Drinks subcategories (5)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'utensils', '#F97316', 'expense', FALSE, v_food_id
  FROM (VALUES ('Groceries'), ('Dining Out'), ('Coffee & Drinks'), ('Fast Food'), ('Alcohol & Bars')) AS s(name)
  WHERE v_food_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Shopping subcategories (5)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'shopping-bag', '#7C3AED', 'expense', FALSE, v_shopping_id
  FROM (VALUES ('Clothing & Accessories'), ('Electronics'), ('Books & Stationery'), ('Online Shopping'), ('Home Goods')) AS s(name)
  WHERE v_shopping_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Healthcare subcategories (5)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'heart-pulse', '#EF4444', 'expense', FALSE, v_healthcare_id
  FROM (VALUES ('Doctor & Hospital'), ('Pharmacy'), ('Dental'), ('Gym & Fitness'), ('Mental Health')) AS s(name)
  WHERE v_healthcare_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Transportation subcategories (5)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'car', '#10B981', 'expense', FALSE, v_transport_id
  FROM (VALUES ('Fuel'), ('Public Transit'), ('Taxi & Ride Share'), ('Parking'), ('Car Maintenance')) AS s(name)
  WHERE v_transport_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Entertainment subcategories (5)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'gamepad-2', '#EC4899', 'expense', FALSE, v_entertain_id
  FROM (VALUES ('Movies & Shows'), ('Music'), ('Sports & Games'), ('Events & Concerts'), ('Subscriptions')) AS s(name)
  WHERE v_entertain_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Bills & Utilities subcategories (5)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'receipt', '#6366F1', 'expense', FALSE, v_bills_id
  FROM (VALUES ('Electricity'), ('Water & Gas'), ('Internet'), ('Phone Bill'), ('Rent & Mortgage')) AS s(name)
  WHERE v_bills_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Insurance subcategories (4)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'shield', '#F59E0B', 'expense', FALSE, v_insurance_id
  FROM (VALUES ('Health Insurance'), ('Car Insurance'), ('Life Insurance'), ('Home Insurance')) AS s(name)
  WHERE v_insurance_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Personal Care subcategories (3)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'user', '#8B5CF6', 'expense', FALSE, v_personal_id
  FROM (VALUES ('Haircut & Salon'), ('Beauty & Skincare'), ('Spa & Wellness')) AS s(name)
  WHERE v_personal_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Family subcategories (4)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'users', '#06B6D4', 'expense', FALSE, v_family_id
  FROM (VALUES ('Kids & Baby'), ('Education'), ('Gifts & Donations'), ('Pet Care')) AS s(name)
  WHERE v_family_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Travel subcategories (4)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'plane', '#0EA5E9', 'expense', FALSE, v_travel_id
  FROM (VALUES ('Flights'), ('Accommodation'), ('Activities & Tours'), ('Local Transport Abroad')) AS s(name)
  WHERE v_travel_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Home & Office subcategories (4)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'home', '#84CC16', 'expense', FALSE, v_home_id
  FROM (VALUES ('Furniture'), ('Home Appliances'), ('Office Supplies'), ('Repairs & Maintenance')) AS s(name)
  WHERE v_home_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Loans & Debt subcategories (3)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'landmark', '#DC2626', 'expense', FALSE, v_loans_id
  FROM (VALUES ('Personal Loan'), ('Student Loan'), ('Credit Card Payment')) AS s(name)
  WHERE v_loans_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Tax subcategories (3)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'file-text', '#6B7280', 'expense', FALSE, v_tax_id
  FROM (VALUES ('Income Tax'), ('GST/VAT'), ('Property Tax')) AS s(name)
  WHERE v_tax_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Other subcategories (1)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'circle-dot', '#94A3B8', 'expense', FALSE, v_other_id
  FROM (VALUES ('Miscellaneous')) AS s(name)
  WHERE v_other_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Salary & Wages subcategories (3)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'wallet', '#10B981', 'income', FALSE, v_salary_id
  FROM (VALUES ('Primary Salary'), ('Bonus & Commission'), ('Overtime')) AS s(name)
  WHERE v_salary_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Freelance & Consulting subcategories (3)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'briefcase', '#F97316', 'income', FALSE, v_freelance_id
  FROM (VALUES ('Consulting'), ('Projects'), ('Side Gigs')) AS s(name)
  WHERE v_freelance_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Business Income subcategories (2)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'building-2', '#7C3AED', 'income', FALSE, v_business_id
  FROM (VALUES ('Revenue'), ('Royalties')) AS s(name)
  WHERE v_business_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Investments subcategories (3)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'trending-up', '#0EA5E9', 'income', FALSE, v_invest_id
  FROM (VALUES ('Dividends'), ('Capital Gains'), ('Interest')) AS s(name)
  WHERE v_invest_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

  -- Other Income subcategories (3)
  INSERT INTO public.categories (name, icon, color, type, is_system_category, parent_id)
  SELECT s.name, 'plus-circle', '#6B7280', 'income', FALSE, v_other_inc_id
  FROM (VALUES ('Gifts Received'), ('Tax Refunds'), ('Awards & Prizes')) AS s(name)
  WHERE v_other_inc_id IS NOT NULL
  ON CONFLICT (name) DO NOTHING;

END $$;
