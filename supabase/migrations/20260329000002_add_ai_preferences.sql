-- Add AI confidence threshold preference to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS ai_confidence_threshold FLOAT DEFAULT 0.6 CHECK (ai_confidence_threshold >= 0 AND ai_confidence_threshold <= 1);

-- Add comment
COMMENT ON COLUMN users.ai_confidence_threshold IS 'Minimum confidence score (0-1) for AI category suggestions. Lower = more suggestions, Higher = more accurate';

-- Create index for performance if needed
CREATE INDEX IF NOT EXISTS idx_users_ai_confidence ON users(ai_confidence_threshold);
