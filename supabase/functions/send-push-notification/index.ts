import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Sends a Firebase Cloud Messaging push notification to all registered
 * devices for a given user.
 *
 * Auth: caller must supply the Supabase service-role key in Authorization header.
 * Only called internally by other Edge Functions (e.g. schedule-payment-reminders).
 */
serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── Verify service-role authorization ─────────────────────────────────────
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ── Parse payload ──────────────────────────────────────────────────────────
  let payload: PushPayload;
  try {
    payload = await req.json() as PushPayload;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { user_id, title, body, data } = payload;
  if (!user_id || !title || !body) {
    return new Response('Missing required fields: user_id, title, body', { status: 400 });
  }

  // ── Supabase service-role client ───────────────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ── Fetch all FCM tokens for this user ─────────────────────────────────────
  const { data: tokens, error: tokensError } = await supabase
    .from('fcm_tokens')
    .select('id, token')
    .eq('user_id', user_id);

  if (tokensError) {
    console.error('[send-push-notification] Failed to fetch tokens:', tokensError.message);
    return new Response('Failed to fetch tokens', { status: 500 });
  }

  if (!tokens || tokens.length === 0) {
    console.log(`[send-push-notification] No FCM tokens found for user ${user_id}`);
    return new Response(JSON.stringify({ sent: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Build Firebase HTTP v1 access token from service account ──────────────
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!serviceAccountJson) {
    console.error('[send-push-notification] FIREBASE_SERVICE_ACCOUNT secret is not configured');
    return new Response('Firebase not configured', { status: 500 });
  }

  let serviceAccount: {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    console.error('[send-push-notification] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON');
    return new Response('Firebase configuration invalid', { status: 500 });
  }

  const accessToken = await getFirebaseAccessToken(serviceAccount);
  if (!accessToken) {
    return new Response('Failed to obtain Firebase access token', { status: 500 });
  }

  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

  let sent = 0;
  const invalidTokenIds: string[] = [];

  // ── Send to each token ─────────────────────────────────────────────────────
  await Promise.all(
    tokens.map(async ({ id, token }) => {
      // Duplicate title/body into data so pushNotificationActionPerformed
      // can read them on Android background tap (notification field is not
      // reliably available in the intent extras).
      const mergedData = { ...(data ?? {}), title, body };

      const message = {
        message: {
          token,
          notification: { title, body },
          data: mergedData,
          android: {
            notification: {
              channel_id: 'hisabify_reminders',
              priority: 'HIGH',
            },
          },
        },
      };

      const res = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (res.ok) {
        sent++;
      } else {
        const errBody = await res.json().catch(() => ({}));
        const errCode = (errBody as { error?: { details?: Array<{ errorCode?: string }> } })
          ?.error?.details?.[0]?.errorCode;

        if (errCode === 'UNREGISTERED' || errCode === 'INVALID_ARGUMENT') {
          // Token is no longer valid — queue for deletion
          invalidTokenIds.push(id);
        } else {
          console.error(`[send-push-notification] FCM error for token ${id}:`, errBody);
        }
      }
    })
  );

  // ── Clean up invalid tokens ────────────────────────────────────────────────
  if (invalidTokenIds.length > 0) {
    await supabase.from('fcm_tokens').delete().in('id', invalidTokenIds);
    console.log(`[send-push-notification] Removed ${invalidTokenIds.length} invalid token(s)`);
  }

  console.log(`[send-push-notification] Sent ${sent}/${tokens.length} notifications for user ${user_id}`);

  return new Response(JSON.stringify({ sent, total: tokens.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

// ── Firebase OAuth2 helper ─────────────────────────────────────────────────
// Generates a short-lived access token using the service account private key.
// Cached per Deno isolate lifetime to avoid redundant OAuth round-trips.

let _tokenCache: { value: string; expiresAt: number } | null = null;

async function getFirebaseAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string | null> {
  const now = Date.now();
  // Reuse cached token if it has more than 60 seconds remaining
  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.value;
  }
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    };

    const b64 = (obj: unknown) =>
      btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const signingInput = `${b64(header)}.${b64(payload)}`;

    // Import the RSA private key
    const pemBody = serviceAccount.private_key
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    const derBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      derBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(signingInput)
    );

    const b64sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const jwt = `${signingInput}.${b64sig}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string };
    const accessToken = tokenData.access_token ?? null;
    if (accessToken) {
      _tokenCache = { value: accessToken, expiresAt: now + 3_600_000 };
    }
    return accessToken;
  } catch (err) {
    console.error('[send-push-notification] Failed to generate Firebase access token:', err);
    return null;
  }
}
