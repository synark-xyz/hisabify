-- Activity Log: Track all financial activities (transactions, settlements, budget changes, savings contributions)
-- Similar to Splitwise "Action History" feature

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  -- Activity type: categorize what kind of event
  activity_type TEXT NOT NULL 
    CHECK (activity_type IN (
      'transaction_added', 'transaction_updated', 'transaction_deleted',
      'debt_created', 'debt_settled', 'debt_updated', 'debt_deleted',
      'budget_created', 'budget_updated', 'budget_deleted',
      'savings_goal_created', 'savings_contribution', 'savings_goal_completed', 'savings_goal_archived',
      'payment_reminder_created', 'payment_reminder_paid', 'payment_reminder_deleted',
      'card_added', 'card_updated', 'card_deleted',
      'recurring_expense_created', 'recurring_expense_updated', 'recurring_expense_deleted'
    )),
  -- Reference to the entity involved
  entity_type TEXT NOT NULL 
    CHECK (entity_type IN ('transaction', 'debt', 'budget', 'savings_goal', 'payment_reminder', 'card', 'recurring_expense')),
  entity_id UUID NOT NULL,
  -- Human-readable description (like Splitwise: "You lent $50 to John")
  description TEXT NOT NULL,
  -- Amount involved (if applicable)
  amount NUMERIC(15, 2),
  currency TEXT DEFAULT 'USD',
  -- Extra metadata as JSON (e.g., { "category": "Food", "payment_method": "cash" })
  metadata JSONB DEFAULT '{}',
  -- For grouping related activities (e.g., multiple settlement payments for one debt)
  group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fetching user's activity feed
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created
  ON public.activity_log (user_id, created_at DESC);

-- Index for fetching activities by entity type
CREATE INDEX IF NOT EXISTS idx_activity_log_entity
  ON public.activity_log (entity_type, entity_id);

-- Index for fetching activities by group (for related events)
CREATE INDEX IF NOT EXISTS idx_activity_log_group
  ON public.activity_log (group_id)
  WHERE group_id IS NOT NULL;

-- Row Level Security
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity log"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log"
  ON public.activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Helper function to log activity (to be called from application code)
-- This is a simple wrapper; complex logic should be in application layer
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_description TEXT,
  p_amount NUMERIC(15, 2) DEFAULT NULL,
  p_currency TEXT DEFAULT 'USD',
  p_metadata JSONB DEFAULT '{}',
  p_group_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.activity_log (
    user_id, activity_type, entity_type, entity_id, description,
    amount, currency, metadata, group_id
  ) VALUES (
    p_user_id, p_activity_type, p_entity_type, p_entity_id, p_description,
    p_amount, p_currency, p_metadata, p_group_id
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable the function to be called by authenticated users
GRANT EXECUTE ON FUNCTION public.log_activity TO authenticated;