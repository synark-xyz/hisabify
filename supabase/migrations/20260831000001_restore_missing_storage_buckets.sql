-- Restores the storage buckets that exist in code but are absent from production.
--
-- Diagnosed alongside the avatar RLS bug (20260831000000): probing the storage API shows
--   receipts             -> NoSuchBucket
--   feedback-attachments -> NoSuchBucket
--   support-attachments  -> NoSuchBucket
-- while the app uploads to two of them. `feedback-attachments` has a migration
-- (20260729000000) that never reached production; `support-attachments` was never declared in
-- a migration at all, only referenced from SupportPage.tsx.
--
-- `receipts` is deliberately NOT recreated: receipt images are stored inline as data URLs in
-- transactions.receipt_url (see ReceiptScannerModal.tsx), so nothing writes to that bucket.
-- Creating it would only re-add an unused public surface.
--
-- Idempotent, because production has drifted and this is applied by hand.

-- --------------------------------------------------------------------------------------
-- feedback-attachments: private. useAppFeedback.ts stores PATHS, not URLs, and support staff
-- resolve them with a signed URL server-side. Must stay private.
-- --------------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users can upload own feedback attachments" ON storage.objects;
CREATE POLICY "Users can upload own feedback attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own feedback attachments" ON storage.objects;
CREATE POLICY "Users can view own feedback attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'feedback-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- --------------------------------------------------------------------------------------
-- support-attachments: public read, because SupportPage.tsx calls getPublicUrl() and emails
-- those links to support staff. A private bucket would make every link 400.
--
-- SupportPage allows submissions from signed-out users and files them under `anonymous/`, so
-- writes cannot be restricted to authenticated users without breaking that path. Writes are
-- therefore open, but confined to this bucket, and reads require knowing the full generated
-- path. Do not put anything sensitive here.
-- --------------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Support attachments are publicly readable" ON storage.objects;
CREATE POLICY "Support attachments are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'support-attachments');

-- Signed-in users write under their own uid; signed-out submissions land in `anonymous/`.
DROP POLICY IF EXISTS "Anyone can upload support attachments" ON storage.objects;
CREATE POLICY "Anyone can upload support attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (
      (storage.foldername(name))[1] = 'anonymous'
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

-- No UPDATE/DELETE policies for either bucket: attachments are write-once evidence.
