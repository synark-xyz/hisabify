-- Add receipt_url column to transactions table for receipt storage
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Create index for receipt_url (for filtering transactions with receipts)
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_url ON public.transactions(receipt_url) WHERE receipt_url IS NOT NULL;

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for receipts bucket
CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);