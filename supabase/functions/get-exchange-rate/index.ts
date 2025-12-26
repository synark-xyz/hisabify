import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_DURATION_HOURS = 6;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { from_currency, to_currency } = await req.json();
    
    console.log(`Fetching exchange rate: ${from_currency} -> ${to_currency}`);

    if (!from_currency || !to_currency) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: from_currency and to_currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Same currency = rate 1
    if (from_currency === to_currency) {
      console.log('Same currency, returning rate 1');
      return new Response(
        JSON.stringify({ 
          rate: 1, 
          source: 'same_currency',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const cacheThreshold = new Date();
    cacheThreshold.setHours(cacheThreshold.getHours() - CACHE_DURATION_HOURS);

    const { data: cachedRate, error: cacheError } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('base_currency', from_currency)
      .eq('target_currency', to_currency)
      .gte('fetched_at', cacheThreshold.toISOString())
      .maybeSingle();

    if (cachedRate && !cacheError) {
      console.log(`Using cached rate: ${cachedRate.rate}`);
      return new Response(
        JSON.stringify({ 
          rate: cachedRate.rate, 
          source: 'cache',
          timestamp: cachedRate.fetched_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from OpenExchangeRates API
    const apiKey = Deno.env.get('OPENEXCHANGE_API_KEY');
    if (!apiKey) {
      console.error('OPENEXCHANGE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Exchange rate service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching from OpenExchangeRates API...');
    
    // OpenExchangeRates free tier only supports USD as base
    // We need to convert via USD if the base is different
    const apiUrl = `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&symbols=${from_currency},${to_currency}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenExchangeRates API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch exchange rate from provider' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data));

    // Calculate rate (API returns rates relative to USD)
    const fromRate = data.rates[from_currency] || 1;
    const toRate = data.rates[to_currency] || 1;
    
    // Convert: 1 from_currency = (toRate / fromRate) to_currency
    const rate = toRate / fromRate;
    
    console.log(`Calculated rate: ${from_currency} -> ${to_currency} = ${rate}`);

    // Cache the rate using upsert
    const { error: upsertError } = await supabase
      .from('exchange_rates')
      .upsert({
        base_currency: from_currency,
        target_currency: to_currency,
        rate: rate,
        fetched_at: new Date().toISOString()
      }, {
        onConflict: 'base_currency,target_currency'
      });

    if (upsertError) {
      console.error('Error caching rate:', upsertError);
      // Don't fail the request, just log the error
    }

    return new Response(
      JSON.stringify({ 
        rate: rate, 
        source: 'OpenExchangeRates',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in get-exchange-rate function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
