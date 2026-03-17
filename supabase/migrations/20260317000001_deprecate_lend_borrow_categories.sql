-- Unlink existing lend/owe transactions from the redundant system categories only
UPDATE public.transactions
SET category_id = NULL
WHERE type IN ('lend', 'owe')
  AND category_id IN (
    SELECT id FROM public.categories
    WHERE is_system_category = TRUE AND category_type IN ('lend', 'owe')
  );

-- Remove the redundant system categories
DELETE FROM public.categories
WHERE is_system_category = TRUE
  AND category_type IN ('lend', 'owe');
