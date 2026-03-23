import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseRequest {
  mode: 'voice' | 'receipt';
  text: string;
  user_currency?: string;
}

interface ParseResult {
  merchant?: string;
  amount?: number;
  currency?: string;
  category?: string;
  date?: string;
  notes?: string;
  confidence: 'high' | 'medium' | 'low';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
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

    const { mode, text, user_currency } = await req.json() as ParseRequest;

    if (!mode || !text?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: mode and text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch user's categories for better AI mapping
    const { data: categories } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', user.id);

    const categoryList = (categories ?? []).map((c: { name: string }) => c.name);
    const categoryContext = categoryList.length > 0
      ? categoryList.join(', ')
      : 'Food, Transport, Shopping, Entertainment, Health, Bills, Other';

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('[parse-transaction] ANTHROPIC_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const baseCurrency = user_currency || 'USD';

    const voicePrompt = `Extract transaction details from this voice description and return ONLY valid JSON.

Voice input: "${text}"

Context:
- User's base currency: ${baseCurrency}
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

    const receiptPrompt = `Extract transaction details from this receipt OCR text and return ONLY valid JSON.

OCR text:
${text}

Context:
- User's base currency: ${baseCurrency}
- Available categories: ${categoryContext}

Return JSON with these fields (omit any field you cannot confidently determine):
{
  "merchant": "the store or merchant name",
  "amount": <the final total amount as a positive number>,
  "currency": "3-letter ISO currency code",
  "category": "best matching category from the list above",
  "date": "YYYY-MM-DD if a date was found",
  "notes": "any relevant notes",
  "confidence": "high" | "medium" | "low"
}

Rules:
- confidence is "high" if merchant AND total are clearly identified, "medium" if one is uncertain, "low" otherwise
- The amount should be the final total (largest clearly labelled total, not subtotals)
- Detect currency from currency symbols or explicit labels in the text
- Do not include fields you cannot determine`;

    const prompt = mode === 'voice' ? voicePrompt : receiptPrompt;

    // let response = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //   'Content-Type': 'application/json',
    //   'x-api-key': anthropicApiKey,
    //   'anthropic-version': '2023-06-01',
    //   },
    //   body: JSON.stringify({
    //   model: 'claude-haiku-3-5-20250514',
    //   max_tokens: 300,
    //   messages: [{ role: 'user', content: prompt }],
    //   }),
    // });
    const geminiApiKey = Deno.env.get('VITE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('[parse-transaction] GEMINI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured', confidence: 'low' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[parse-transaction] Calling Gemini API');
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
      signal: new AbortController().signal,
    }).then(res => {
      // Normalize Gemini response format to Anthropic format
      if (res.ok) {
        return res.json().then(data => ({
          ok: true,
          json: async () => ({
            content: [{ text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '' }],
          }),
        } as unknown as Response));
      }
      return res;
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[parse-transaction] Gemini API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error', confidence: 'low' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
    const content: string = aiResponse.content?.[0]?.text ?? '';

    // Strip markdown code fences if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = (jsonMatch ? jsonMatch[1] : content).trim();

    let parsed: ParseResult;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('[parse-transaction] Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', confidence: 'low' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[parse-transaction] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
