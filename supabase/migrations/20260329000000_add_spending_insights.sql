-- Create spending_insights table
CREATE TABLE IF NOT EXISTS spending_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('predicted_expense', 'anomaly', 'savings_optimization', 'goal_progress', 'spending_habits')),
  category_id UUID REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT,
  severity FLOAT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_spending_insights_user ON spending_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_spending_insights_type ON spending_insights(type);
CREATE INDEX IF NOT EXISTS idx_spending_insights_created ON spending_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spending_insights_user_created ON spending_insights(user_id, created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_spending_insights_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spending_insights_timestamp
BEFORE UPDATE ON spending_insights
FOR EACH ROW
EXECUTE FUNCTION update_spending_insights_timestamp();

-- Enable RLS
ALTER TABLE spending_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own insights
CREATE POLICY "Users can view own insights" ON spending_insights
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights" ON spending_insights
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights" ON spending_insights
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights" ON spending_insights
  FOR DELETE
  USING (auth.uid() = user_id);
