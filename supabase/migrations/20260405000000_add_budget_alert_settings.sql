-- Budget Alert Settings Migration
-- Adds configurable alert threshold and enable/disable per budget
-- Also adds missing is_recurring and is_template columns

ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS alert_threshold INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS alert_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_name TEXT;

-- Create index for performance on alert queries
CREATE INDEX IF NOT EXISTS idx_budgets_alert_settings 
ON budgets(user_id, alert_enabled) 
WHERE alert_enabled = true;

-- Create index for recurring and template queries
CREATE INDEX IF NOT EXISTS idx_budgets_recurring 
ON budgets(user_id, is_recurring) 
WHERE is_recurring = true;

CREATE INDEX IF NOT EXISTS idx_budgets_template 
ON budgets(user_id, is_template) 
WHERE is_template = true;