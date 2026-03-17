-- Subscription pricing table
-- Each row defines the monthly/yearly price for a specific currency.
-- The app resolves a user's price by matching their currency_code.
-- If no match is found, the row with currency_code = 'DEFAULT' is used.
-- Manage rows directly in the Supabase table editor.

CREATE TABLE public.subscription_pricing (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text        NOT NULL UNIQUE,   -- e.g. 'USD', 'BDT', 'INR' — or 'DEFAULT' for the fallback
  monthly_price numeric(12, 2) NOT NULL,
  yearly_price  numeric(12, 2) NOT NULL,
  note          text,                          -- admin label, e.g. 'Bangladesh', 'South Asia'
  is_active     boolean     NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Allow anyone (including unauthenticated) to read pricing rows.
-- Only admins write rows via the Supabase dashboard.
ALTER TABLE public.subscription_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read subscription_pricing"
  ON public.subscription_pricing
  FOR SELECT
  USING (is_active = true);

-- Seed: DEFAULT fallback (USD)
INSERT INTO public.subscription_pricing (currency_code, monthly_price, yearly_price, note) VALUES
  ('DEFAULT', 4.99,  39.99, 'Global fallback — USD'),
  ('USD',     4.99,  39.99, 'United States'),
  ('EUR',     4.49,  35.99, 'Europe'),
  ('GBP',     3.99,  31.99, 'United Kingdom'),
  ('CAD',     6.99,  54.99, 'Canada'),
  ('AUD',     7.99,  62.99, 'Australia'),
  ('INR',   199.00,1599.00, 'India'),
  ('BDT',   299.00,2499.00, 'Bangladesh'),
  ('PKR',   799.00,6499.00, 'Pakistan'),
  ('BRL',    24.90, 199.00, 'Brazil'),
  ('MXN',    89.00, 699.00, 'Mexico'),
  ('IDR', 49000.00,390000.00,'Indonesia'),
  ('MYR',    19.90, 159.00, 'Malaysia'),
  ('SGD',     6.99,  54.99, 'Singapore'),
  ('PHP',   249.00,1999.00, 'Philippines'),
  ('THB',   169.00,1349.00, 'Thailand'),
  ('NGN',  1999.00,15999.00,'Nigeria'),
  ('KES',   499.00,3999.00, 'Kenya'),
  ('ZAR',    89.00, 699.00, 'South Africa'),
  ('TRY',   149.00,1199.00, 'Turkey'),
  ('AED',    17.99, 139.00, 'UAE'),
  ('SAR',    17.99, 139.00, 'Saudi Arabia'),
  ('EGP',   149.00,1199.00, 'Egypt'),
  ('JPY',   599.00,4799.00, 'Japan'),
  ('KRW',  6500.00,52000.00,'South Korea'),
  ('CNY',    34.99, 279.00, 'China');
