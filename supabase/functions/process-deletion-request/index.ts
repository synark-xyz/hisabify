// supabase/functions/process-deletion-request/index.ts
//
// Admin-only fulfilment for the manual deletion request flow. The only path
// that can move a deletion_requests row from 'pending' to 'completed', and
// the single authoritative wipe covering every user-scoped table — replaces
// the client-side deleteAllTableData() list in DataPage.tsx, which only
// covered 7 of 15+ user-scoped tables and neither storage bucket.
//
// See docs/superpowers/specs/2026-07-30-manual-deletion-requests-design.md.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Max-Age': '86400',
};

const DATA_SCOPE_TABLES = [
  'transactions',
  'budgets',
  'cards',
  'savings_goals',
  'payment_reminders',
  'recurring_expenses',
  'report_templates',
  'debts',
  'activity_log',
  'custom_category_user_log',
  'notifications',
] as const;

// account scope wipes everything in data scope, plus these.
const ACCOUNT_SCOPE_EXTRA_TABLES = [
  'subscriptions',
  'fcm_tokens',
  'account_types',
  'app_feedback',
  'user_behavior_events',
] as const;

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function wipeStorageFolder(
  supabaseAdmin: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
): Promise<string | null> {
  const { data: files, error: listError } = await supabaseAdmin.storage.from(bucket).list(userId);
  if (listError) return `${bucket} list: ${listError.message}`;
  if (!files || files.length === 0) return null;

  const paths = files.map((f) => `${userId}/${f.name}`);
  const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);
  if (removeError) return `${bucket} remove: ${removeError.message}`;
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const { requestId } = await req.json();
    if (!requestId || typeof requestId !== 'string') {
      return jsonResponse({ error: 'requestId is required' }, 400);
    }

    // Caller-scoped client: proves the JWT is valid and lets us check
    // is_admin() as that caller, rather than duplicating the allowlist here.
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: isAdmin, error: adminCheckError } = await supabaseUser.rpc('is_admin');
    if (adminCheckError || !isAdmin) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
    );

    const { data: request, error: fetchError } = await supabaseAdmin
      .from('deletion_requests')
      .select('id, user_id, scope, status')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError || !request) {
      return jsonResponse({ error: 'Request not found' }, 404);
    }
    if (request.status !== 'pending') {
      return jsonResponse({ error: `Request is already ${request.status}` }, 409);
    }

    const userId = request.user_id as string;
    const scope = request.scope as 'data' | 'account';

    const tables: string[] = [...DATA_SCOPE_TABLES];
    if (scope === 'account') tables.push(...ACCOUNT_SCOPE_EXTRA_TABLES);

    const tableResults = await Promise.all(
      tables.map(async (table) => {
        const { error } = await supabaseAdmin.from(table).delete().eq('user_id', userId);
        return error ? `${table}: ${error.message}` : null;
      }),
    );

    const wipeErrors = tableResults.filter((e): e is string => e !== null);

    const receiptsError = await wipeStorageFolder(supabaseAdmin, 'receipts', userId);
    if (receiptsError) wipeErrors.push(receiptsError);

    if (scope === 'account') {
      const feedbackError = await wipeStorageFolder(supabaseAdmin, 'feedback-attachments', userId);
      if (feedbackError) wipeErrors.push(feedbackError);
    }

    if (wipeErrors.length > 0) {
      console.error(`Wipe partially failed for request ${requestId}:`, wipeErrors);
      return jsonResponse({ error: 'Wipe partially failed', details: wipeErrors }, 500);
    }

    if (scope === 'account') {
      // public.users is keyed to auth by user_id; id is a separate surrogate PK.
      const { error: usersDeleteError } = await supabaseAdmin.from('users').delete().eq('user_id', userId);
      if (usersDeleteError) {
        console.error('Failed to delete users row:', usersDeleteError.message);
        return jsonResponse({ error: 'Failed to delete users row' }, 500);
      }

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.error('Failed to delete auth user:', authDeleteError.message);
        return jsonResponse({ error: 'Failed to delete auth user' }, 500);
      }
    }

    const { data: adminUser } = await supabaseUser.auth.getUser();

    // Atomic completion: only the caller whose UPDATE actually matches a row
    // still 'pending' gets to write the audit entry, so two concurrent
    // approvals of the same request can't both "win" and double-log.
    const { data: completedRows, error: completeError } = await supabaseAdmin
      .from('deletion_requests')
      .update({
        status: 'completed',
        resolved_at: new Date().toISOString(),
        resolved_by: adminUser?.user?.email ?? null,
        user_id: null,
        email: null,
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select('id');

    if (completeError) {
      console.error('Failed to finalize deletion_requests row:', completeError.message);
      return jsonResponse({ error: 'Failed to finalize request' }, 500);
    }
    if (!completedRows || completedRows.length === 0) {
      // Another concurrent call already completed (or cancelled) this request.
      return jsonResponse({ error: 'Request already processed' }, 409);
    }

    await supabaseAdmin.from('audit_log').insert({
      user_id: userId,
      action: scope === 'account' ? 'account_deleted' : 'financial_data_deleted',
    });

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    console.error('Unexpected error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
