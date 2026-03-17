import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Stripe price IDs are configured via the product dashboard.
// These price IDs should be created in your Stripe dashboard and set as env vars.
// Fallback to env vars STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY, or use inline prices.
const MONTHLY_PRICE_AMOUNT = 499;   // $4.99 in cents
const YEARLY_PRICE_AMOUNT = 3999;   // $39.99 in cents
const TRIAL_PERIOD_DAYS = 7;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Authenticate the request — require a valid Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { plan, success_url, cancel_url } = await req.json() as {
      plan: 'monthly' | 'yearly';
      success_url: string;
      cancel_url: string;
    };

    if (plan !== 'monthly' && plan !== 'yearly') {
      return new Response(
        JSON.stringify({ error: 'Invalid plan. Must be "monthly" or "yearly".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const unitAmount = plan === 'monthly' ? MONTHLY_PRICE_AMOUNT : YEARLY_PRICE_AMOUNT;
    const interval = plan === 'monthly' ? 'month' : 'year';

    // Use named price IDs if provided, otherwise use inline price data
    const monthlyPriceId = Deno.env.get('STRIPE_PRICE_MONTHLY');
    const yearlyPriceId = Deno.env.get('STRIPE_PRICE_YEARLY');
    const priceId = plan === 'monthly' ? monthlyPriceId : yearlyPriceId;

    // Build the line items payload for Stripe Checkout
    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: 'usd',
              unit_amount: unitAmount,
              recurring: { interval },
              product_data: {
                name: 'Hisabify Pro',
                description: 'Unlimited goals, advanced analytics, and more.',
              },
            },
            quantity: 1,
          },
        ];

    // Create a Stripe Checkout Session via the Stripe REST API
    const sessionPayload: Record<string, unknown> = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: success_url ?? 'https://hisabify.app/?checkout=success',
      cancel_url: cancel_url ?? 'https://hisabify.app/?checkout=cancelled',
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
    };

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: encodeStripePayload(sessionPayload),
    });

    const session = await stripeResponse.json() as { id?: string; url?: string; error?: { message: string } };

    if (!stripeResponse.ok || session.error) {
      console.error('[create-checkout-session] Stripe error:', session.error);
      return new Response(
        JSON.stringify({ error: session.error?.message ?? 'Stripe checkout creation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[create-checkout-session] Unexpected error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

/**
 * Encodes a nested object into Stripe's x-www-form-urlencoded format.
 * Stripe's REST API requires this encoding for nested objects (e.g. line_items[0][price]).
 */
function encodeStripePayload(obj: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;

    if (value === null || value === undefined) {
      continue;
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          parts.push(encodeStripePayload(item as Record<string, unknown>, `${fullKey}[${index}]`));
        } else {
          parts.push(`${encodeURIComponent(`${fullKey}[${index}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === 'object') {
      parts.push(encodeStripePayload(value as Record<string, unknown>, fullKey));
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
    }
  }

  return parts.join('&');
}
