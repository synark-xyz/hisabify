-- Add new columns to budgets table for enhanced period support
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Update existing records to have proper start/end dates based on month/year
UPDATE public.budgets 
SET 
  start_date = make_timestamptz(year, month, 1, 0, 0, 0),
  end_date = (make_timestamptz(year, month, 1, 0, 0, 0) + interval '1 month' - interval '1 day'),
  name = 'Monthly Budget'
WHERE start_date IS NULL;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_budgets_updated_at ON public.budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for period queries
CREATE INDEX IF NOT EXISTS idx_budgets_period ON public.budgets(user_id, period_type, start_date, end_date);