-- Create savings_goals table
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  icon TEXT DEFAULT 'target',
  color TEXT DEFAULT '#10B981',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'savings_goals' AND policyname = 'Users can view their own savings goals'
  ) THEN
    CREATE POLICY "Users can view their own savings goals"
    ON public.savings_goals FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'savings_goals' AND policyname = 'Users can create their own savings goals'
  ) THEN
    CREATE POLICY "Users can create their own savings goals"
    ON public.savings_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'savings_goals' AND policyname = 'Users can update their own savings goals'
  ) THEN
    CREATE POLICY "Users can update their own savings goals"
    ON public.savings_goals FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'savings_goals' AND policyname = 'Users can delete their own savings goals'
  ) THEN
    CREATE POLICY "Users can delete their own savings goals"
    ON public.savings_goals FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_savings_goals_updated_at'
  ) THEN
    CREATE TRIGGER update_savings_goals_updated_at
    BEFORE UPDATE ON public.savings_goals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
