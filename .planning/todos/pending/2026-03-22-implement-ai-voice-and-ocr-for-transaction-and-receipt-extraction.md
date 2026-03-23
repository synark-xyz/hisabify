---
created: 2026-03-22T00:00:00.000Z
title: Implement AI voice and OCR for transaction and receipt extraction
area: ui
files:
  - src/hooks/useVoiceInput.ts
  - src/components/VoiceInputFlow.tsx
  - src/components/ReceiptUpload.tsx
  - src/lib/imageProcessor.ts
  - supabase/functions/
---

## Problem

Current voice input uses regex-based parsing (~70-80% accuracy) which misses complex phrasings, multiple items, and non-standard formats. Receipt OCR uses Tesseract.js client-side which struggles with varied receipt layouts and handwriting.

Both need AI upgrade:
- **Voice:** Replace regex parser with AI (Claude/GPT) to extract merchant, amount, category, date, and notes from natural language with high accuracy
- **Receipt OCR:** Combine Tesseract.js text extraction with AI to intelligently parse the structured data (merchant, line items, total, date, tax) regardless of receipt format
- Both should auto-fill the AddTransactionModal fields correctly

## Solution

### Voice AI
1. After speech recognition returns raw text, send to a Supabase Edge Function
2. Edge Function calls Claude API with a structured prompt to extract: `{ merchant, amount, currency, category, date, notes }`
3. Return structured JSON to client and pre-fill transaction form fields
4. Fallback to current regex parser if AI call fails

### Receipt AI+OCR
1. Tesseract.js extracts raw text from receipt image (existing)
2. Send extracted text + (optionally) the image to a Supabase Edge Function
3. Edge Function calls Claude API (vision) to parse structured data from receipt
4. Return `{ merchant, total, date, items[], tax, currency }` to pre-fill form
5. Show confidence indicators on pre-filled fields

### Infrastructure
- New Supabase Edge Function: `parse-transaction` (handles both voice text and receipt text/image)
- Add `ANTHROPIC_API_KEY` to Edge Function secrets
- Update `VoiceInputFlow.tsx` to call edge function after transcription
- Update `ReceiptUpload.tsx` to call edge function after Tesseract extraction
- Model: claude-haiku-4-5-20251001 (fast + cheap for extraction tasks)
