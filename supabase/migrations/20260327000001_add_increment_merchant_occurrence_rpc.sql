-- Add RPC for incrementing merchant occurrence count
-- Used by parse-transaction edge function for ai_merchant_knowledge upserts

CREATE OR REPLACE FUNCTION public.increment_merchant_occurrence(
  p_merchant_name TEXT,
  p_category TEXT DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_confidence NUMERIC(3,2) DEFAULT 1.0
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.ai_merchant_knowledge
  SET
    occurrence_count = occurrence_count + 1,
    category = COALESCE(
      CASE
        WHEN p_category IS NOT NULL AND p_category != '' THEN
          CASE
            WHEN occurrence_count = 0 THEN p_category
            ELSE
              CASE
                WHEN random() < (1.0 / (occurrence_count + 1)) THEN p_category
                ELSE category
              END
          END
        ELSE category
      END,
      category
    ),
    currency = COALESCE(
      CASE
        WHEN p_currency IS NOT NULL AND p_currency != '' THEN
          CASE
            WHEN occurrence_count = 0 THEN p_currency
            ELSE
              CASE
                WHEN random() < (1.0 / (occurrence_count + 1)) THEN p_currency
                ELSE currency
              END
          END
        ELSE currency
      END,
      currency
    ),
    confidence = LEAST(1.0, (confidence + p_confidence) / 2.0),
    updated_at = now()
  WHERE merchant_name = p_merchant_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
