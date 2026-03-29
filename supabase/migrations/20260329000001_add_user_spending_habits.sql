-- Create user_spending_habits table (internal - for AI knowledgebase)
CREATE TABLE IF NOT EXISTS user_spending_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  frequency_per_week FLOAT DEFAULT 0,
  average_transaction FLOAT DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spending_habits_user ON user_spending_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_spending_habits_category ON user_spending_habits(category_id);
CREATE INDEX IF NOT EXISTS idx_spending_habits_created ON user_spending_habits(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_spending_habits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spending_habits_timestamp
BEFORE UPDATE ON user_spending_habits
FOR EACH ROW
EXECUTE FUNCTION update_spending_habits_timestamp();

-- Enable RLS (optional - internal table, may not need strict RLS)
ALTER TABLE user_spending_habits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own habits
CREATE POLICY "Users can view own habits" ON user_spending_habits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits" ON user_spending_habits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
