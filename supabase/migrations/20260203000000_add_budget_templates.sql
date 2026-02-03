-- Add budget template support
-- This migration adds fields to support saving budgets as reusable templates

-- Add template fields to budgets table
ALTER TABLE budgets
  ADD COLUMN is_template BOOLEAN DEFAULT FALSE,
  ADD COLUMN template_name TEXT;

-- Create index for faster template queries
CREATE INDEX idx_budgets_is_template ON budgets(user_id, is_template) WHERE is_template = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN budgets.is_template IS 'Indicates if this budget is saved as a template for future use';
COMMENT ON COLUMN budgets.template_name IS 'Custom name for the template (optional, defaults to category name)';
