const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const DEFAULT_CATEGORIES =
  'Food, Transport, Shopping, Entertainment, Health, Bills, Other';

export interface GeminiReceiptResult {
  merchant?: string;
  amount?: number;
  currency?: string;
  category?: string;
  date?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Calls Gemini Vision API directly from the client to extract receipt fields.
 * Uses VITE_GEMINI_API_KEY — handles any language/script natively (Japanese,
 * Arabic, Korean, Chinese, Cyrillic, etc.) without pre-selection.
 *
 * @param base64       - Image data without the "data:..." prefix
 * @param mimeType     - e.g. "image/jpeg"
 * @param userCurrency - ISO 4217 code used as default currency hint in the prompt
 * @param categories   - Comma-separated category list for classification hint
 */
export async function callGeminiVision(
  base64: string,
  mimeType: string,
  userCurrency: string,
  categories: string = DEFAULT_CATEGORIES,
): Promise<GeminiReceiptResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not configured');

  const prompt = `Analyze this receipt image and extract transaction details.
Return ONLY valid JSON (no markdown, no code fences):
{
  "merchant": "store or business name",
  "amount": <total the customer paid, as a number>,
  "currency": "ISO 4217 3-letter code (default: ${userCurrency})",
  "category": "best match from: ${categories}",
  "date": "YYYY-MM-DD",
  "confidence": "high if merchant AND amount clearly identified, medium if one is uncertain, low otherwise"
}
Rules:
- amount = what the customer actually paid (look for Total, Grand Total, 合計, مجموع, Gesamt, 합계, etc.)
- ¥ symbol → JPY unless context clearly says CNY
- Omit any field you cannot determine.
- Do not translate any text. Keep merchant names exactly as they appear on the receipt.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Override device locale so Gemini doesn't translate field values
      'Accept-Language': 'en-US',
    },
    body: JSON.stringify({
      contents: [{ parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: prompt },
      ]}],
      generationConfig: { maxOutputTokens: 600, temperature: 0.1 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Vision ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Strip markdown fences if model wraps response despite instructions
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
  }

  // Extract just the {...} block in case model adds surrounding prose
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) jsonStr = objectMatch[0];

  // Fix common model JSON quirks: trailing commas before } or ]
  jsonStr = jsonStr
    .replace(/,(\s*[}\]])/g, '$1')
    // Remove JavaScript-style single-line comments
    .replace(/\/\/[^\n]*/g, '');

  if (import.meta.env.DEV) {
    console.log('[Gemini Vision] raw response text:', text);
    console.log('[Gemini Vision] cleaned jsonStr:', jsonStr);
  }

  const parsed: GeminiReceiptResult = JSON.parse(jsonStr);
  if (!parsed.confidence) parsed.confidence = 'low';
  return parsed;
}
