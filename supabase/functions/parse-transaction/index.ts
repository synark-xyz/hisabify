import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Max-Age': '86400',
};

interface ParseRequest {
  mode: 'voice' | 'receipt';
  text?: string;           // still used for voice mode and text-fallback
  imageBase64?: string;    // NEW: base64-encoded image (no data: prefix) for Gemini Vision
  imageMimeType?: string;  // NEW: 'image/jpeg' | 'image/png' | 'image/webp'
  user_currency?: string;
}

interface ParseResult {
  merchant?: string;
  amount?: number;
  subtotal?: number;
  tax?: number;
  tip?: number;
  currency?: string;
  category?: string;
  date?: string;
  notes?: string;
  confidence: 'high' | 'medium' | 'low';
  _provider?: string; // 'mindee' | 'gemini' for debugging
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Hash text using Web Crypto SHA-256 */
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Compute receipt signature from parsed fields (not image bytes) */
async function computeReceiptSignature(
  merchant?: string,
  amount?: number,
  date?: string,
  currency?: string
): Promise<string> {
  const sigInput = [merchant, amount, date, currency].filter(Boolean).join('|');
  return hashText(sigInput);
}

/** Detect script type from text content */
function detectScriptType(text: string): string {
  if (/[\u0600-\u06FF]/.test(text)) return 'arabic';
  if (/[\u0980-\u09FF]/.test(text)) return 'devanagari';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'han';
  if (/[\u0E00-\u0E7F]/.test(text)) return 'thai';
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) return 'cjk';
  return 'latin';
}

/** Map amount to range bucket */
function amountToRange(amount?: number): string {
  if (!amount) return 'unknown';
  if (amount < 10) return 'micro';
  if (amount < 100) return 'small';
  if (amount < 1000) return 'medium';
  return 'large';
}

// ----------------------------------------------------------------
// Knowledge base write with retry
// ----------------------------------------------------------------

async function writeReceiptKnowledge(
  serviceRoleClient: ReturnType<typeof createClient>,
  params: {
    receiptSignature: string;
    scriptType: string;
    currency?: string;
    countryCode?: string;
    merchantName?: string;
    merchantCategory?: string;
    amountRange: string;
    hadTaxLine: boolean;
    hadTipLine: boolean;
    hadChangeLine: boolean;
    aiConfidence: string;
    aiRawResponse: Record<string, unknown>;
  }
) {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await serviceRoleClient.from('ai_receipt_knowledge').insert({
        receipt_signature: params.receiptSignature,
        script_type: params.scriptType,
        currency: params.currency,
        country_code: params.countryCode,
        merchant_name: params.merchantName,
        merchant_category: params.merchantCategory,
        amount_range: params.amountRange,
        had_tax_line: params.hadTaxLine,
        had_tip_line: params.hadTipLine,
        had_change_line: params.hadChangeLine,
        ai_confidence: params.aiConfidence,
        ai_raw_response: params.aiRawResponse,
      });
      return { success: true };
    } catch (err) {
      console.error(`[knowledge] receipt_knowledge insert attempt ${attempt + 1} failed:`, err);
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt))); // 100, 200, 400ms
      }
    }
  }
  console.error('[knowledge] All retry attempts failed for ai_receipt_knowledge:', params);
  return { success: false };
}

async function upsertMerchantKnowledge(
  serviceRoleClient: ReturnType<typeof createClient>,
  params: {
    merchantName: string;
    merchantDisplay?: string;
    category?: string;
    currency?: string;
    countryCode?: string;
    confidence: number;
  }
) {
  const maxRetries = 3;
  const normalizedName = params.merchantName.toLowerCase().trim();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await serviceRoleClient.from('ai_merchant_knowledge').upsert(
        {
          merchant_name: normalizedName,
          merchant_display: params.merchantDisplay || params.merchantName,
          category: params.category,
          currency: params.currency,
          country_code: params.countryCode,
          occurrence_count: 1,
          confidence: params.confidence,
        },
        {
          onConflict: 'merchant_name',
          // Increment occurrence and update confidence on conflict
        }
      );

      // Update occurrence count and confidence on conflict
      await serviceRoleClient.rpc('increment_merchant_occurrence', {
        p_merchant_name: normalizedName,
        p_category: params.category,
        p_currency: params.currency,
        p_confidence: params.confidence,
      });

      return { success: true };
    } catch (err) {
      // If RPC doesn't exist yet, just upsert without increment
      if (attempt === maxRetries - 1) {
        console.error('[knowledge] All retry attempts failed for ai_merchant_knowledge:', err);
        return { success: false };
      }
      await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)));
    }
  }
  return { success: false };
}

// ----------------------------------------------------------------
// Mindee V2 Receipt API call
// Docs: https://api-v2.mindee.net/openapi.json
// Flow: POST /v2/products/extraction/enqueue → poll /v2/jobs/{id} → GET result_url
// ----------------------------------------------------------------

interface MindeeV2Field {
  value?: string | number | boolean | null;
  confidence?: number;
  polygon?: number[][];
}

type MindeeV2Fields = Record<string, MindeeV2Field | MindeeV2Field[]>;

function parseMindeeV2Fields(fields: MindeeV2Fields): ParseResult {
  const scalarFields = Object.entries(fields).filter(
    ([, f]) => !Array.isArray(f) && (f as MindeeV2Field).value != null
  ) as [string, MindeeV2Field][];

  const getByKeys = (keys: string[]): MindeeV2Field | undefined => {
    for (const key of keys) {
      const f = fields[key];
      if (f && !Array.isArray(f) && (f as MindeeV2Field).value != null) return f as MindeeV2Field;
    }
    return undefined;
  };

  // Named lookups first (standard + common custom names)
  let amountField = getByKeys(['total_amount', 'amount', 'grand_total', 'total', 'total_price', 'price', 'sum']);
  let merchantField = getByKeys(['supplier_name', 'merchant', 'merchant_name', 'vendor', 'store_name', 'company', 'shop', 'restaurant']);
  let dateField = getByKeys(['date', 'receipt_date', 'transaction_date', 'purchase_date', 'invoice_date']);
  const taxField = getByKeys(['total_tax', 'tax', 'tax_amount', 'vat', 'consumption_tax', 'gst', 'hst']);
  const tipField = getByKeys(['tip', 'gratuity']);
  const currencyField = getByKeys(['currency']);
  const categoryField = getByKeys(['category', 'subcategory', 'type']);

  // Broad fallback: scan all scalar fields by value type if named lookup missed
  if (!amountField || !merchantField || !dateField) {
    let bestAmountVal = 0;
    for (const [key, f] of scalarFields) {
      const strVal = String(f.value ?? '').trim();
      // Amount fallback: any numeric field > 0, pick largest (likely the total)
      if (!amountField) {
        const num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > 0 && num < 1_000_000 && num > bestAmountVal) {
          bestAmountVal = num;
          amountField = f;
        }
      }
      // Merchant fallback: a string field with 2+ words or mixed case, not a number/date
      if (!merchantField && strVal.length > 2 && isNaN(Number(strVal)) && !strVal.match(/^\d{4}[-/]/)) {
        // Prefer fields whose key hints at a name
        if (/name|shop|store|company|vendor|merchant|supplier|brand/i.test(key)) {
          merchantField = f;
        } else if (!merchantField && strVal.split(' ').length >= 2) {
          merchantField = f;
        }
      }
      // Date fallback: a field whose value looks like a date string
      if (!dateField && strVal.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/)) {
        dateField = f;
      }
    }
  }

  const rawAmount = amountField?.value;
  const amount = rawAmount != null ? parseFloat(String(rawAmount).replace(/[^0-9.]/g, '')) : undefined;

  let date: string | undefined;
  if (dateField?.value) {
    const d = new Date(String(dateField.value));
    if (!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
  }

  const categoryMap: Record<string, string> = {
    food: 'Food', restaurant: 'Food', gasoline: 'Transport', parking: 'Transport',
    toll: 'Transport', accommodation: 'Bills', transport: 'Transport',
    telecom: 'Bills', software: 'Shopping', shopping: 'Shopping',
    energy: 'Bills', miscellaneous: 'Other',
  };
  const rawCategory = categoryField?.value ? String(categoryField.value).toLowerCase() : undefined;
  const category = rawCategory ? (categoryMap[rawCategory] ?? String(categoryField!.value)) : undefined;

  const amountConf = amountField?.confidence ?? 0;
  const merchantConf = merchantField?.confidence ?? 0;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (amountConf > 0.8 && merchantConf > 0.8) confidence = 'high';
  else if (amountConf > 0.5 || merchantConf > 0.5) confidence = 'medium';

  return {
    merchant: merchantField?.value != null ? String(merchantField.value) : undefined,
    amount: amount != null && !isNaN(amount) ? amount : undefined,
    tax: taxField?.value != null ? parseFloat(String(taxField.value)) : undefined,
    tip: tipField?.value != null ? parseFloat(String(tipField.value)) : undefined,
    currency: currencyField?.value != null ? String(currencyField.value).toUpperCase().slice(0, 3) : undefined,
    category,
    date,
    confidence,
    _provider: 'mindee-v2',
    // Always include raw fields so client can inspect what Mindee actually returned
    _raw_fields: fields as unknown as Record<string, unknown>,
  } as ParseResult & { _raw_fields: Record<string, unknown> };
}

async function callMindeeReceiptV2(
  apiKey: string,
  modelId: string,
  base64Image: string,
): Promise<ParseResult> {
  // Step 1: Enqueue document for async processing
  const formData = new FormData();
  formData.append('model_id', modelId);
  formData.append('file_base64', base64Image);

  const enqueueRes = await fetch(
    'https://api-v2.mindee.net/v2/products/extraction/enqueue',
    {
      method: 'POST',
      headers: { 'Authorization': apiKey },
      body: formData,
    }
  );

  if (!enqueueRes.ok) {
    const errText = await enqueueRes.text();
    console.error('[parse-transaction] Mindee V2 enqueue error:', enqueueRes.status, errText);
    throw new Error(`Mindee V2 enqueue error: ${enqueueRes.status}`);
  }

  const enqueueData = await enqueueRes.json();
  const jobId: string = enqueueData.job?.id;
  const pollingUrl: string | undefined = enqueueData.job?.polling_url;

  if (!jobId) {
    console.error('[parse-transaction] Mindee V2: no job ID in enqueue response', enqueueData);
    throw new Error('Mindee V2: no job ID returned');
  }

  // Step 2: Poll until Processed or Failed (max ~24s)
  const MAX_ATTEMPTS = 10;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, i === 0 ? 1500 : 2500));

    const pollUrl = pollingUrl ?? `https://api-v2.mindee.net/v2/jobs/${jobId}`;
    const pollRes = await fetch(pollUrl, { headers: { 'Authorization': apiKey } });

    if (!pollRes.ok) throw new Error(`Mindee V2 poll error: ${pollRes.status}`);

    const pollData = await pollRes.json();
    const status: string = pollData.job?.status;
    console.log(`[parse-transaction] Mindee V2 job ${jobId} status: ${status} (attempt ${i + 1})`);

    if (status === 'Failed') throw new Error('Mindee V2: processing failed');

    if (status === 'Processed') {
      const resultUrl: string = pollData.job?.result_url;
      if (!resultUrl) throw new Error('Mindee V2: no result_url in completed job');

      const resultRes = await fetch(resultUrl, { headers: { 'Authorization': apiKey } });
      if (!resultRes.ok) throw new Error(`Mindee V2 result fetch error: ${resultRes.status}`);

      const resultData = await resultRes.json();
      // Log full result so Supabase edge logs show exactly what Mindee returned
      console.log('[parse-transaction] Mindee V2 full result:', JSON.stringify(resultData));
      const fields: MindeeV2Fields = resultData?.inference?.result?.fields ?? {};
      if (Object.keys(fields).length === 0) {
        console.warn('[parse-transaction] Mindee V2 returned empty fields. Full result:', JSON.stringify(resultData));
      }
      return parseMindeeV2Fields(fields);
    }
  }

  throw new Error('Mindee V2: polling timeout after max attempts');
}

// ----------------------------------------------------------------
// Gemini Vision API call (receipt image fallback)
// ----------------------------------------------------------------

async function callGeminiVision(
  apiKey: string,
  base64Image: string,
  mimeType: string,
  userCurrency: string,
  categoryContext: string,
): Promise<ParseResult> {
  const prompt = `Analyze this receipt image and extract transaction details.
Return ONLY valid JSON (no markdown fences):
{
  "merchant": "store or business name",
  "amount": <total amount the customer paid, as a number>,
  "subtotal": <pre-tax total if shown, as a number>,
  "tax": <tax or VAT amount if shown, as a number>,
  "tip": <gratuity if shown, as a number>,
  "currency": "ISO 4217 3-letter code (default: ${userCurrency})",
  "category": "best match from: ${categoryContext}",
  "date": "YYYY-MM-DD",
  "confidence": "high if merchant AND amount clearly identified, medium if one uncertain, low otherwise"
}
Rules:
- amount = what the customer actually paid (look for Total, 合計, مجموع, Gesamt, etc.)
- For ¥ symbol → JPY. Omit any field you cannot determine.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Image } },
            { text: prompt },
          ],
        }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.1 },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('[parse-transaction] Gemini Vision error:', response.status, errText);
    throw new Error(`Gemini Vision error: ${response.status}`);
  }

  const data = await response.json();
  const content: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { ...parseAiResponse(content), _provider: 'gemini-vision' };
}

// ----------------------------------------------------------------
// Voice prompt template
// ----------------------------------------------------------------

function buildVoicePrompt(userCurrency: string, categoryContext: string): string {
  return `Extract transaction details from this voice description and return ONLY valid JSON.

Voice input: "{text}"

Context:
- User's base currency: ${userCurrency}
- Available categories: ${categoryContext}

Return JSON with these fields (omit any field you cannot confidently determine):
{
  "merchant": "the merchant or payee name",
  "amount": <positive number>,
  "currency": "3-letter ISO currency code",
  "category": "best matching category from the list above",
  "date": "YYYY-MM-DD if a date was mentioned",
  "notes": "any extra context worth capturing",
  "confidence": "high" | "medium" | "low"
}

Rules:
- confidence is "high" if merchant AND amount are clear, "medium" if one is uncertain, "low" otherwise
- Infer currency from country/language context or use user's base currency as default
- Do not include fields you cannot determine`;
}

// ----------------------------------------------------------------
// Gemini Text API call (voice input only)
// ----------------------------------------------------------------

async function callGeminiText(
  apiKey: string,
  prompt: string
): Promise<ParseResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.1 },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[parse-transaction] Gemini API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  return parseAiResponse(content);
}

function parseAiResponse(content: string): ParseResult {
  // Strip markdown code fences if present
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = (jsonMatch ? jsonMatch[1] : content).trim();

  let parsed: ParseResult;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('[parse-transaction] Failed to parse AI response:', content);
    throw new Error('Failed to parse AI response');
  }

  // Validate required fields
  if (!parsed.confidence) {
    parsed.confidence = 'low';
  }

  return parsed;
}

// ----------------------------------------------------------------
// Main handler
// ----------------------------------------------------------------

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Parse request ---
    const body = await req.json() as ParseRequest;
    const { mode, text, imageBase64, imageMimeType, user_currency } = body;

    if (!mode) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: mode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (mode === 'receipt' && !text?.trim() && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Receipt mode requires either text or imageBase64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (mode === 'voice' && !text?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Voice mode requires text input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Rate limiting (receipt scan only) ---
    if (mode === 'receipt') {
      const { data: rateLimit } = await supabase.rpc('check_rate_limit', {
        p_user_id: user.id,
        p_action: 'receipt_scan',
        p_limit: 20,
        p_window_secs: 3600,
      });

      if (rateLimit?.exceeded) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded. Please wait before scanning another receipt.',
            retry_after: rateLimit.reset_at,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // --- Fetch user's categories for better AI mapping ---
    const { data: categories } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', user.id);

    const categoryList = (categories ?? []).map((c: { name: string }) => c.name);
    const categoryContext = categoryList.length > 0
      ? categoryList.join(', ')
      : 'Food, Transport, Shopping, Entertainment, Health, Bills, Other';

    const baseCurrency = user_currency || 'USD';

    let parsed: ParseResult;

    if (mode === 'receipt' && imageBase64) {
      // --- Receipt scanning: Mindee V2 (async, language-agnostic, custom model) ---
      const mindeeApiKey = Deno.env.get('MINDEE_API_KEY');
      const mindeeModelId = Deno.env.get('MINDEE_MODEL_ID');
      if (!mindeeApiKey || !mindeeModelId) {
        console.error('[parse-transaction] MINDEE_API_KEY or MINDEE_MODEL_ID not configured');
        return new Response(
          JSON.stringify({ error: 'Receipt scanning not configured', confidence: 'low' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      try {
        parsed = await callMindeeReceiptV2(mindeeApiKey, mindeeModelId, imageBase64);
        console.log(`[parse-transaction] Mindee V2 succeeded (provider: mindee-v2, confidence: ${parsed.confidence})`);
      } catch (mindeeErr) {
        const errorMsg = mindeeErr instanceof Error ? mindeeErr.message : 'Mindee V2 OCR failed';
        console.error('[parse-transaction] Mindee V2 failed, trying Gemini Vision fallback:', errorMsg);

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) {
          console.error('[parse-transaction] GEMINI_API_KEY not configured — no fallback available');
          return new Response(
            JSON.stringify({ error: 'All OCR providers failed or not configured', confidence: 'low' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        try {
          parsed = await callGeminiVision(geminiApiKey, imageBase64, imageMimeType ?? 'image/jpeg', baseCurrency, categoryContext);
          console.log(`[parse-transaction] Gemini Vision fallback succeeded (provider: gemini-vision, confidence: ${parsed.confidence})`);
        } catch (geminiErr) {
          const geminiMsg = geminiErr instanceof Error ? geminiErr.message : 'Gemini Vision failed';
          console.error('[parse-transaction] Gemini Vision also failed:', geminiMsg);
          return new Response(
            JSON.stringify({ error: 'All OCR providers failed', confidence: 'low' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }
    } else {
      // --- Voice input: Gemini Text ---
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
      if (!geminiApiKey) {
        console.error('[parse-transaction] GEMINI_API_KEY is not configured');
        return new Response(
          JSON.stringify({ error: 'AI service not configured', confidence: 'low' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const prompt = buildVoicePrompt(baseCurrency, categoryContext).replace('{text}', text!);
      parsed = await callGeminiText(geminiApiKey, prompt);
    }

    // --- Write to knowledge base (service_role client, fire-and-forget with retry) ---
    const serviceRoleUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')!;
    const serviceRoleClient = createClient(serviceRoleUrl, serviceRoleKey);

    const receiptSignature = await computeReceiptSignature(
      parsed.merchant,
      parsed.amount,
      parsed.date,
      parsed.currency
    );

    const scriptType = text ? detectScriptType(text) : 'unknown';
    const amountRange = amountToRange(parsed.amount);

    // Write receipt knowledge
    writeReceiptKnowledge(serviceRoleClient, {
      receiptSignature,
      scriptType,
      currency: parsed.currency,
      merchantName: parsed.merchant,
      merchantCategory: parsed.category,
      amountRange,
      hadTaxLine: !!parsed.tax,
      hadTipLine: !!parsed.tip,
      hadChangeLine: false, // Would need to detect from OCR text
      aiConfidence: parsed.confidence,
      aiRawResponse: parsed as unknown as Record<string, unknown>,
    });

    // Upsert merchant knowledge if high confidence
    if (parsed.confidence === 'high' && parsed.merchant) {
      upsertMerchantKnowledge(serviceRoleClient, {
        merchantName: parsed.merchant,
        merchantDisplay: parsed.merchant,
        category: parsed.category,
        currency: parsed.currency,
        confidence: 1.0,
      });
    }

    // --- Return result ---
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[parse-transaction] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: message, confidence: 'low' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
