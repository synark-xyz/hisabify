import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── RevenueCat event type definitions ───────────────────────────────────────

interface RevenueCatSubscriberAttribute {
  value: string;
  updated_at_ms: number;
}

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  aliases?: string[];
  expiration_at_ms?: number | null;
  period_type?: string;
  product_id?: string;
  store?: string;
  environment?: string;
  presented_offering_id?: string | null;
  subscriber_attributes?: Record<string, RevenueCatSubscriberAttribute>;
}

interface RevenueCatWebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}

// ─── Event types that activate Pro ───────────────────────────────────────────

const ACTIVATE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIBER_ALIAS',
]);

const DEACTIVATE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
]);

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // RevenueCat does not send OPTIONS pre-flight — no CORS handling needed.
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── Verify the shared-secret authorization header ──────────────────────────
  const expectedAuthHeader = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_HEADER');
  if (!expectedAuthHeader) {
    console.error('[revenuecat-webhook] REVENUECAT_WEBHOOK_AUTH_HEADER is not configured');
    return new Response('Webhook not configured', { status: 500 });
  }

  const incomingAuth = req.headers.get('Authorization');
  if (!incomingAuth || incomingAuth !== expectedAuthHeader) {
    console.warn('[revenuecat-webhook] Unauthorized request — invalid Authorization header');
    return new Response('Unauthorized', { status: 401 });
  }

  // ── Parse payload ──────────────────────────────────────────────────────────
  let payload: RevenueCatWebhookPayload;
  try {
    payload = await req.json() as RevenueCatWebhookPayload;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const event = payload?.event;
  if (!event?.type || !event?.app_user_id) {
    console.warn('[revenuecat-webhook] Malformed event payload', { payload });
    return new Response('Malformed event', { status: 400 });
  }

  console.log(`[revenuecat-webhook] Received event: ${event.type} for user ${event.app_user_id}`);

  // ── Supabase service-role client (bypasses RLS) ───────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const userId = event.app_user_id;

  // ── Dispatch on event type ─────────────────────────────────────────────────
  if (ACTIVATE_EVENTS.has(event.type)) {
    // `public.users` is keyed to auth by `user_id`; `id` is a separate surrogate PK.
    // `.select()` so a zero-row match is visible — PostgREST reports success otherwise.
    const { data, error } = await supabase
      .from('users')
      .update({
        subscription_type: 'pro',
        subscription_status: 'active',
      })
      .eq('user_id', userId)
      .select('user_id');

    if (error) {
      console.error(`[revenuecat-webhook] Failed to activate Pro for user ${userId}:`, error.message);
      return new Response('Database update failed', { status: 500 });
    }

    if (!data?.length) {
      console.warn(`[revenuecat-webhook] Activate matched 0 rows in public.users for user ${userId}`);
    }

    console.log(`[revenuecat-webhook] Pro activated for user ${userId} (event: ${event.type})`);

  } else if (DEACTIVATE_EVENTS.has(event.type)) {
    // 'base', not 'free' — the CHECK constraint is subscription_type IN ('base','pro').
    const { data, error } = await supabase
      .from('users')
      .update({
        subscription_type: 'base',
        subscription_status: 'cancelled',
      })
      .eq('user_id', userId)
      .select('user_id');

    if (error) {
      console.error(`[revenuecat-webhook] Failed to deactivate Pro for user ${userId}:`, error.message);
      return new Response('Database update failed', { status: 500 });
    }

    if (!data?.length) {
      console.warn(`[revenuecat-webhook] Deactivate matched 0 rows in public.users for user ${userId}`);
    }

    console.log(`[revenuecat-webhook] Pro deactivated for user ${userId} (event: ${event.type})`);

  } else {
    // Acknowledge receipt — we don't need to act on this event type
    console.log(`[revenuecat-webhook] Ignoring unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
