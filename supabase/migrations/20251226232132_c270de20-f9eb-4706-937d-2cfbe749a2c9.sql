-- Update existing card numbers to only store last 4 digits (masked format)
UPDATE public.cards 
SET card_number = RIGHT(card_number, 4)
WHERE LENGTH(card_number) > 4;

-- Create a trigger function to ensure only last 4 digits are stored
CREATE OR REPLACE FUNCTION public.mask_card_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If card number is longer than 4 digits, keep only last 4
  IF LENGTH(NEW.card_number) > 4 THEN
    NEW.card_number := RIGHT(NEW.card_number, 4);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically mask card numbers on insert/update
CREATE TRIGGER mask_card_number_trigger
BEFORE INSERT OR UPDATE ON public.cards
FOR EACH ROW
EXECUTE FUNCTION public.mask_card_number();

-- Add a comment to document the security measure
COMMENT ON COLUMN public.cards.card_number IS 'Stores only last 4 digits of card number for display purposes. Full card numbers should never be stored.';