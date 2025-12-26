-- Add base_currency to profiles if not exists (already has currency column, rename it)
-- The profiles table already has a 'currency' column which serves as base_currency

-- Create exchange_rates cache table
CREATE TABLE public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (base_currency, target_currency)
);

-- Enable RLS on exchange_rates
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Exchange rates are readable by all authenticated users
CREATE POLICY "Exchange rates are readable by authenticated users"
ON public.exchange_rates
FOR SELECT
USING (auth.role() = 'authenticated');

-- Only system can insert/update exchange rates (via service role)
CREATE POLICY "System can manage exchange rates"
ON public.exchange_rates
FOR ALL
USING (auth.role() = 'service_role');

-- Add multi-currency columns to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS amount_original NUMERIC,
ADD COLUMN IF NOT EXISTS currency_original TEXT,
ADD COLUMN IF NOT EXISTS amount_converted NUMERIC,
ADD COLUMN IF NOT EXISTS currency_base TEXT,
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS rate_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS exchange_source TEXT DEFAULT 'manual';

-- Migrate existing data: set original = current amount, converted = current amount
UPDATE public.transactions 
SET 
  amount_original = amount,
  currency_original = 'USD',
  amount_converted = amount,
  currency_base = 'USD',
  exchange_rate = 1,
  rate_timestamp = created_at,
  exchange_source = 'manual'
WHERE amount_original IS NULL;