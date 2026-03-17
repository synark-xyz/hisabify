import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET env var is not set');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();

  // Verify the Stripe webhook signature
  let event: StripeEvent;
  try {
    event = await verifyStripeSignature(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed';
    console.error('[stripe-webhook] Signature verification failed:', message);
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  console.log(`[stripe-webhook] Processing event: ${event.type}`);

  // Use the service role key to bypass RLS for webhook updates
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as StripeCheckoutSession;
        const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan ?? 'monthly';

        if (!userId) {
          console.warn('[stripe-webhook] checkout.session.completed: no user ID found in session');
          break;
        }

        console.log(`[stripe-webhook] Activating Pro for user ${userId} (plan: ${plan})`);

        const { error } = await supabase
          .from('users')
          .update({
            subscription_type: 'pro',
            subscription_status: 'active',
            stripe_customer_id: session.customer ?? null,
            stripe_subscription_id: session.subscription ?? null,
          })
          .eq('id', userId);

        if (error) {
          console.error('[stripe-webhook] Failed to activate subscription:', error.message);
          return new Response('Database update failed', { status: 500 });
        }

        console.log(`[stripe-webhook] Pro activated for user ${userId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as StripeSubscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // Try to look up the user by stripe_customer_id
          console.warn('[stripe-webhook] customer.subscription.updated: no user ID in metadata, looking up by customer');
          const customerId = subscription.customer;

          const { data: userRow } = await supabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (!userRow) {
            console.warn(`[stripe-webhook] No user found for customer ${customerId}`);
            break;
          }

          const isActive = subscription.status === 'active' || subscription.status === 'trialing';
          const { error } = await supabase
            .from('users')
            .update({
              subscription_type: isActive ? 'pro' : 'free',
              subscription_status: subscription.status,
              stripe_subscription_id: subscription.id,
            })
            .eq('id', userRow.id);

          if (error) {
            console.error('[stripe-webhook] Failed to update subscription status:', error.message);
          }
          break;
        }

        const isActive = subscription.status === 'active' || subscription.status === 'trialing';
        const { error } = await supabase
          .from('users')
          .update({
            subscription_type: isActive ? 'pro' : 'free',
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
          })
          .eq('id', userId);

        if (error) {
          console.error('[stripe-webhook] Failed to update subscription status:', error.message);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as StripeSubscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          const customerId = subscription.customer;
          const { data: userRow } = await supabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

          if (!userRow) {
            console.warn(`[stripe-webhook] No user found for deleted subscription, customer: ${customerId}`);
            break;
          }

          const { error } = await supabase
            .from('users')
            .update({
              subscription_type: 'free',
              subscription_status: 'cancelled',
            })
            .eq('id', userRow.id);

          if (error) {
            console.error('[stripe-webhook] Failed to cancel subscription:', error.message);
          }
          break;
        }

        console.log(`[stripe-webhook] Cancelling Pro for user ${userId}`);
        const { error } = await supabase
          .from('users')
          .update({
            subscription_type: 'free',
            subscription_status: 'cancelled',
          })
          .eq('id', userId);

        if (error) {
          console.error('[stripe-webhook] Failed to cancel subscription:', error.message);
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Event processing error';
    console.error(`[stripe-webhook] Error processing event ${event.type}:`, message);
    return new Response(`Event processing error: ${message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

// ─── Stripe type definitions ─────────────────────────────────────────────────

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

interface StripeCheckoutSession {
  id: string;
  customer: string | null;
  subscription: string | null;
  client_reference_id: string | null;
  metadata: Record<string, string> | null;
  payment_status: string;
  status: string;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  metadata: Record<string, string>;
}

// ─── Stripe webhook signature verification ───────────────────────────────────

/**
 * Verifies a Stripe webhook signature using HMAC-SHA256.
 * See: https://stripe.com/docs/webhooks/signatures
 */
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<StripeEvent> {
  const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts['t'];
  const v1 = parts['v1'];

  if (!timestamp || !v1) {
    throw new Error('Invalid signature format');
  }

  // Protect against replay attacks: reject webhooks older than 5 minutes
  const timeDiff = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (timeDiff > 300) {
    throw new Error(`Webhook timestamp too old: ${timeDiff}s`);
  }

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(signedPayload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (computedSignature !== v1) {
    throw new Error('Signature mismatch');
  }

  return JSON.parse(payload) as StripeEvent;
}
