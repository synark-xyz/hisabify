# Manual Deletion Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the instant, self-service "Delete Financial Data" / "Delete Account" actions on `/profile/data` with a manual, review-gated request flow — the user submits an optional exit reason, an admin approves in `/admin`, and approval runs one authoritative server-side wipe covering every user-scoped table (fixing a real gap: the current client-side wipe list misses 8+ tables and both storage buckets).

**Architecture:** One new table (`deletion_requests`) with a `pending → cancelled | completed` lifecycle, RLS-enforced so a user can only insert their own pending row and flip it to `cancelled`. A new admin-only edge function (`process-deletion-request`) does the actual wipe and is the only path that can move a row to `completed`. `DataPage.tsx` gets a shared bottom-sheet for both scopes plus a pending-request banner; `AdminPage.tsx`'s existing generic table viewer gains one non-generic capability (an Approve button) for this one table. The old `delete-user` edge function and its instant client-side wipe are deleted outright — a live self-service instant-delete path next to a reviewed one is the exact contradiction the spec calls out.

**Tech Stack:** Supabase (Postgres + RLS + Deno edge functions), React + TypeScript, Vitest for pure-logic tests, i18n via `react-i18next` (en/ja/bn).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-30-manual-deletion-requests-design.md` — every task below implements a named section of it; read it first if anything here is ambiguous.
- No reject path. `status` only ever moves `pending → cancelled` (user) or `pending → completed` (admin, via edge function only).
- Reason and free-text detail fields must be optional/skippable — GDPR Art. 12 requires erasure requests to be actionable without answering anything.
- `deletion_requests.user_id` and `.email` are nulled on fulfilment (anonymisation) — the row is never deleted; `audit_log` remains the permanent per-user evidence.
- The admin allowlist stays single-sourced in `public.is_admin()`; do not add a second allowlist inside the new edge function.
- `AdminPage.tsx` is intentionally untranslated ("internal tool, single operator" — existing comment in the file); do not add i18n there.
- `users` table updates/deletes must match on `user_id`, never `id` (existing project gotcha — `id` is a separate surrogate PK).
- Match existing code style: 2-space indent, `@/` import alias, no comments beyond the "why, not what" bar already used throughout this codebase.

---

## File Structure

**Create:**
- `supabase/migrations/20260731000000_add_deletion_requests.sql` — table, RLS, `audit_log` CHECK update.
- `supabase/functions/process-deletion-request/index.ts` — admin-only fulfilment edge function.
- `src/lib/deletionRequestBanner.ts` — pure date/deadline logic (the one genuinely testable piece of this feature).
- `src/lib/deletionRequestBanner.test.ts` — Vitest coverage for the above.
- `src/hooks/useDeletionRequest.ts` — fetch pending request, submit, cancel.
- `src/components/DeletionRequestSheet.tsx` — shared bottom sheet for both scopes.

**Modify:**
- `src/pages/profile/DataPage.tsx` — replace both `AlertDialog`s with the new sheet + banner; delete `deleteAllTableData`, `handleDeleteData`, `handleDeleteFullAccount`.
- `src/pages/AdminPage.tsx` — add `deletion_requests` to `TABLES`, pending-count badge, Approve button, non-truncated `detail` column, status badge.
- `src/i18n/locales/en/translation.json`, `ja/translation.json`, `bn/translation.json` — add `deletionRequest.*` keys, remove the four now-dead `profileData.*` confirm-phrase keys.
- `src/lib/legalContent.tsx` — Terms §9 (line ~164-168), Terms §11 (line ~185-188), Privacy §8 (line ~455-458), Privacy §9 (line ~483-486).
- `src/components/SubscriptionTermsContent.tsx` — §7 (line ~178-181).
- `/Users/sam/Documents/GitHub/hisabify/CLAUDE.md` — rewrite the "Account deletion is immediate and irreversible" paragraph in the Legal Documents & Data Privacy section.

**Delete:**
- `supabase/functions/delete-user/` (entire directory).

---

### Task 1: Database schema — `deletion_requests` table + `audit_log` CHECK

**Files:**
- Create: `supabase/migrations/20260731000000_add_deletion_requests.sql`

**Interfaces:**
- Produces: table `public.deletion_requests` with columns `id uuid`, `user_id uuid` (nullable), `email text` (nullable), `scope text` (`'data'|'account'`), `status text` (`'pending'|'cancelled'|'completed'`, default `'pending'`), `reason text`, `detail text`, `requested_at timestamptz`, `resolved_at timestamptz`, `resolved_by text`. Unique partial index on `(user_id) where status = 'pending'`. Two new `audit_log.action` CHECK values: `'deletion_requested'`, `'deletion_request_cancelled'`.

- [ ] **Step 1: Write the migration file**

```sql
-- Manual deletion request queue: the source of truth for the review-gated
-- account/data deletion flow. Nothing in DataPage.tsx deletes data directly
-- any more — it only inserts a pending row here. Fulfilment (the actual wipe)
-- happens in supabase/functions/process-deletion-request, triggered by an
-- admin clicking Approve in /admin. See
-- docs/superpowers/specs/2026-07-30-manual-deletion-requests-design.md.

CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID,
  email         TEXT,
  scope         TEXT NOT NULL CHECK (scope IN ('data', 'account')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'cancelled', 'completed')),
  reason        TEXT,
  detail        TEXT,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   TEXT
);

-- One pending request per user at a time — makes the DataPage banner query
-- single-row and blocks duplicate submissions without any client-side guard.
CREATE UNIQUE INDEX IF NOT EXISTS deletion_requests_one_pending
  ON public.deletion_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status
  ON public.deletion_requests (status, requested_at DESC);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- Insert own row, and only ever as 'pending' — a client cannot insert a
-- pre-completed row to bypass review.
DROP POLICY IF EXISTS "Users can request their own deletion" ON public.deletion_requests;
CREATE POLICY "Users can request their own deletion"
  ON public.deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Read own rows, or admin reads all (backs the /admin queue).
DROP POLICY IF EXISTS "Users can view own deletion requests" ON public.deletion_requests;
CREATE POLICY "Users can view own deletion requests"
  ON public.deletion_requests FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- The only mutation a user can make: pending -> cancelled. Fulfilment
-- (pending -> completed) is service-role-only, via the edge function, and
-- therefore doesn't need a policy here at all.
DROP POLICY IF EXISTS "Users can cancel their own pending request" ON public.deletion_requests;
CREATE POLICY "Users can cancel their own pending request"
  ON public.deletion_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- Extend the existing audit trail with the two new action types this flow
-- writes. The constraint is the default Postgres name for an inline column
-- CHECK (`{table}_{column}_check`) — see
-- supabase/migrations/20260730000000_add_privacy_audit_log.sql for the
-- original definition.
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    'data_export',
    'financial_data_deleted',
    'account_deleted',
    'deletion_requested',
    'deletion_request_cancelled'
  ));
```

- [ ] **Step 2: Verify locally**

Run: `npx supabase db push` (or apply via the Supabase dashboard SQL editor if that's this project's normal workflow — check `supabase/config.toml` / existing migration workflow before assuming CLI access).
Expected: migration applies with no errors. If `audit_log_action_check` doesn't exist under that name, the `DROP CONSTRAINT IF EXISTS` is a no-op and the `ADD CONSTRAINT` will fail with a duplicate-constraint-name error — in that case, find the real name with:
```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'public.audit_log'::regclass AND contype = 'c';
```
and adjust the `DROP CONSTRAINT` line.

- [ ] **Step 3: Regenerate Supabase types**

Run: `supabase gen types typescript --project-id ffyqmulhhhuebfosewfv > src/integrations/supabase/types.ts` (project ID from `supabase/config.toml`).
If CLI/project access isn't available in this environment, manually add a `deletion_requests` entry to `Database['public']['Tables']` in `src/integrations/supabase/types.ts`, matching the shape of the neighboring `audit_log` entry (Row/Insert/Update variants, `id`/`user_id`/`email`/`scope`/`status`/`reason`/`detail`/`requested_at`/`resolved_at`/`resolved_by`, all nullable except `id`, `scope`, `status`, `requested_at`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260731000000_add_deletion_requests.sql src/integrations/supabase/types.ts
git commit -m "Add deletion_requests table for review-gated account deletion"
```

---

### Task 2: Pure banner/deadline logic (TDD)

**Files:**
- Create: `src/lib/deletionRequestBanner.ts`
- Create: `src/lib/deletionRequestBanner.test.ts`

**Interfaces:**
- Produces: `DELETION_RESPONSE_DAYS: number`, `getDeletionDeadline(requestedAt: string): Date`, `formatDeletionRequestedDate(requestedAt: string): string`, `formatDeletionDeadline(requestedAt: string): string`. Consumed by `DataPage.tsx`'s banner in Task 6 (`formatDeletionRequestedDate` for "requested on", `formatDeletionDeadline` for "complete by").

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/deletionRequestBanner.test.ts
import { describe, it, expect } from 'vitest';
import {
  DELETION_RESPONSE_DAYS,
  getDeletionDeadline,
  formatDeletionRequestedDate,
  formatDeletionDeadline,
} from './deletionRequestBanner';

describe('deletionRequestBanner', () => {
  it('DELETION_RESPONSE_DAYS is 30', () => {
    expect(DELETION_RESPONSE_DAYS).toBe(30);
  });

  it('getDeletionDeadline adds 30 days to the request timestamp', () => {
    const requestedAt = '2026-07-01T00:00:00.000Z';
    const deadline = getDeletionDeadline(requestedAt);
    expect(deadline.toISOString()).toBe('2026-07-31T00:00:00.000Z');
  });

  it('getDeletionDeadline handles a month boundary correctly', () => {
    const requestedAt = '2026-01-15T12:00:00.000Z';
    const deadline = getDeletionDeadline(requestedAt);
    expect(deadline.toISOString()).toBe('2026-02-14T12:00:00.000Z');
  });

  it('formatDeletionRequestedDate renders a human-readable date', () => {
    expect(formatDeletionRequestedDate('2026-07-30T10:00:00.000Z')).toBe('Jul 30, 2026');
  });

  it('formatDeletionDeadline renders the request date plus 30 days', () => {
    expect(formatDeletionDeadline('2026-07-01T00:00:00.000Z')).toBe('Jul 31, 2026');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/deletionRequestBanner.test.ts`
Expected: FAIL — `Cannot find module './deletionRequestBanner'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/deletionRequestBanner.ts
import { format } from 'date-fns';

// Matches the Privacy Policy's "Response: 30 days" commitment (see
// src/lib/legalContent.tsx §8/§9) and the spec's decision that the retention
// clock starts at the request, not at admin approval.
export const DELETION_RESPONSE_DAYS = 30;

export function getDeletionDeadline(requestedAt: string): Date {
  const requested = new Date(requestedAt);
  return new Date(requested.getTime() + DELETION_RESPONSE_DAYS * 24 * 60 * 60 * 1000);
}

export function formatDeletionRequestedDate(requestedAt: string): string {
  return format(new Date(requestedAt), 'MMM d, yyyy');
}

export function formatDeletionDeadline(requestedAt: string): string {
  return format(getDeletionDeadline(requestedAt), 'MMM d, yyyy');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/deletionRequestBanner.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/deletionRequestBanner.ts src/lib/deletionRequestBanner.test.ts
git commit -m "Add pure deletion-request deadline/date formatting logic"
```

---

### Task 3: Edge function — `process-deletion-request` + remove `delete-user`

**Files:**
- Create: `supabase/functions/process-deletion-request/index.ts`
- Delete: `supabase/functions/delete-user/` (entire directory)

**Interfaces:**
- Consumes: `public.is_admin()` (SQL function, `supabase/migrations/20260729000100_add_admin_read_access.sql`); `deletion_requests` table from Task 1.
- Produces: HTTP endpoint `POST /functions/v1/process-deletion-request` with body `{ requestId: string }`. Called by `AdminPage.tsx` in Task 7 via `supabase.functions.invoke('process-deletion-request', { body: { requestId } })`.

- [ ] **Step 1: Write the edge function**

```typescript
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
) {
  const { data: files, error: listError } = await supabaseAdmin.storage.from(bucket).list(userId);
  if (listError || !files || files.length === 0) return;

  const paths = files.map((f) => `${userId}/${f.name}`);
  await supabaseAdmin.storage.from(bucket).remove(paths);
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

    await Promise.all(tables.map((table) => supabaseAdmin.from(table).delete().eq('user_id', userId)));
    await wipeStorageFolder(supabaseAdmin, 'receipts', userId);

    if (scope === 'account') {
      await wipeStorageFolder(supabaseAdmin, 'feedback-attachments', userId);
      // public.users is keyed to auth by user_id; id is a separate surrogate PK.
      await supabaseAdmin.from('users').delete().eq('user_id', userId);

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.error('Failed to delete auth user:', authDeleteError.message);
        return jsonResponse({ error: 'Failed to delete auth user' }, 500);
      }
    }

    const { data: adminUser } = await supabaseUser.auth.getUser();

    await supabaseAdmin.from('audit_log').insert({
      user_id: userId,
      action: scope === 'account' ? 'account_deleted' : 'financial_data_deleted',
    });

    await supabaseAdmin
      .from('deletion_requests')
      .update({
        status: 'completed',
        resolved_at: new Date().toISOString(),
        resolved_by: adminUser?.user?.email ?? null,
        user_id: null,
        email: null,
      })
      .eq('id', requestId);

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    console.error('Unexpected error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
```

- [ ] **Step 2: Delete the now-redundant instant-delete function**

```bash
rm -rf supabase/functions/delete-user
```

This function let any authenticated client instantly delete their own auth user with no review — exactly the self-service path this feature replaces. Leaving it deployed alongside a reviewed flow means two contradictory answers to "is my account gone?" (the same concern already documented for the soft-delete case in `src/hooks/useDataManagement.ts`).

- [ ] **Step 3: Deploy and smoke-test**

Run: `npx supabase functions deploy process-deletion-request` (and confirm `delete-user` is removed from the dashboard/CLI's function list, or redeploy to clear it, per this project's normal deploy workflow).
Expected: function deploys with no errors. Manual smoke test (can't unit-test Deno edge functions under Vitest — no existing edge function in this repo has tests, so this doesn't introduce a new testing convention): insert a test `deletion_requests` row as a non-admin user, call the function as that user's own JWT, confirm `403`; call as the admin (`scode43@gmail.com`) JWT, confirm the target user's `transactions` row and `deletion_requests.status` both reflect the wipe.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/process-deletion-request supabase/functions/delete-user
git commit -m "Add process-deletion-request edge function, remove delete-user"
```

---

### Task 4: `useDeletionRequest` hook

**Files:**
- Create: `src/hooks/useDeletionRequest.ts`

**Interfaces:**
- Consumes: `useAuth()` for `user`; `supabase` client; `deletion_requests` table from Task 1.
- Produces: `DeletionScope = 'data' | 'account'`; `DeletionReason` union of the seven chip values; `DeletionRequestRow` interface; `useDeletionRequest()` returning `{ pendingRequest, loading, submitting, submitRequest, cancelRequest }`. Consumed by `DataPage.tsx` (Task 6) and `DeletionRequestSheet.tsx` (Task 5, via the `submitRequest`/`submitting` props DataPage passes down).

- [ ] **Step 1: Write the hook**

```typescript
// src/hooks/useDeletionRequest.ts
//
// Manual, review-gated deletion: submitting only inserts a pending row —
// nothing is deleted until an admin approves it in /admin (see
// supabase/functions/process-deletion-request). Replaces the instant
// deleteAllTableData()/delete-user flow that used to live in DataPage.tsx.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type DeletionScope = 'data' | 'account';

export type DeletionReason =
  | 'too_expensive'
  | 'missing_features'
  | 'found_better'
  | 'privacy'
  | 'not_using'
  | 'too_complicated'
  | 'other';

export const DELETION_REASONS: DeletionReason[] = [
  'too_expensive',
  'missing_features',
  'found_better',
  'privacy',
  'not_using',
  'too_complicated',
  'other',
];

export interface DeletionRequestRow {
  id: string;
  scope: DeletionScope;
  status: 'pending' | 'cancelled' | 'completed';
  reason: string | null;
  detail: string | null;
  requested_at: string;
}

export function useDeletionRequest() {
  const { user } = useAuth();
  const [pendingRequest, setPendingRequest] = useState<DeletionRequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPending = useCallback(async () => {
    if (!user) {
      setPendingRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('deletion_requests')
      .select('id, scope, status, reason, detail, requested_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (error) {
      logger.error(error, { component: 'useDeletionRequest', action: 'fetchPending' });
    }
    setPendingRequest((data as DeletionRequestRow | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const submitRequest = useCallback(
    async (scope: DeletionScope, reason: DeletionReason | null, detail: string): Promise<boolean> => {
      if (!user) return false;

      setSubmitting(true);
      try {
        const { error: insertError } = await supabase.from('deletion_requests').insert({
          user_id: user.id,
          email: user.email ?? null,
          scope,
          reason,
          detail: detail.trim() || null,
        });

        if (insertError) {
          logger.error(insertError, { component: 'useDeletionRequest', action: 'submitRequest' });
          return false;
        }

        await supabase.from('audit_log').insert({ user_id: user.id, action: 'deletion_requested' });
        await fetchPending();
        return true;
      } finally {
        setSubmitting(false);
      }
    },
    [user, fetchPending],
  );

  const cancelRequest = useCallback(async (): Promise<boolean> => {
    if (!user || !pendingRequest) return false;

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('deletion_requests')
        .update({ status: 'cancelled' })
        .eq('id', pendingRequest.id);

      if (updateError) {
        logger.error(updateError, { component: 'useDeletionRequest', action: 'cancelRequest' });
        return false;
      }

      await supabase.from('audit_log').insert({ user_id: user.id, action: 'deletion_request_cancelled' });
      await fetchPending();
      return true;
    } finally {
      setSubmitting(false);
    }
  }, [user, pendingRequest, fetchPending]);

  return { pendingRequest, loading, submitting, submitRequest, cancelRequest };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (existing `deletion_requests` type from Task 1 must already be present in `types.ts`, and `logger` must already export a matching `.error(error, meta)` signature — confirm against `src/lib/logger.ts` if this fails).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDeletionRequest.ts
git commit -m "Add useDeletionRequest hook for submit/cancel/pending-status"
```

---

### Task 5: `DeletionRequestSheet` component

**Files:**
- Create: `src/components/DeletionRequestSheet.tsx`
- Modify: `src/i18n/locales/en/translation.json`, `ja/translation.json`, `bn/translation.json`

**Interfaces:**
- Consumes: `BaseModalSheet` family from `src/components/ui/base-modal-sheet.tsx`; `DeletionScope`, `DeletionReason`, `DELETION_REASONS` from Task 4.
- Produces: `DeletionRequestSheet` component with props `{ open: boolean; onOpenChange: (open: boolean) => void; scope: DeletionScope; submitting: boolean; onConfirm: (reason: DeletionReason | null, detail: string) => Promise<boolean> }`. Consumed by `DataPage.tsx` in Task 6 (rendered twice, once per scope, or once with `scope` swapped based on which Danger Zone button was clicked).

- [ ] **Step 1: Add i18n keys**

Add to `src/i18n/locales/en/translation.json`, inside the top-level object (near the existing `"profileData"` block, e.g. right after it):

```json
  "deletionRequest": {
    "sheetTitleData": "Request data deletion",
    "sheetTitleAccount": "Request account deletion",
    "explainData": "This requests erasure of all transactions, budgets, cards, savings goals, and reminders. Your login account stays active. Requests are reviewed manually — nothing is deleted until approved, within 30 days.",
    "explainAccount": "This requests permanent removal of your account and everything in it — transactions, budgets, cards, goals, and login credentials. Requests are reviewed manually — nothing is deleted until approved, within 30 days. This does not cancel an active app-store subscription; cancel that separately.",
    "reasonLabel": "Why are you leaving? (optional)",
    "reason_too_expensive": "Too expensive",
    "reason_missing_features": "Missing features",
    "reason_found_better": "Found a better app",
    "reason_privacy": "Privacy concerns",
    "reason_not_using": "Not using it",
    "reason_too_complicated": "Too complicated",
    "reason_other": "Other",
    "detailLabel": "Anything you'd like us to know? (optional)",
    "detailPlaceholder": "Tell us more...",
    "submit": "Request deletion",
    "submitting": "Submitting…",
    "submitted": "Deletion requested",
    "submittedDesc": "We'll review your request within 30 days.",
    "submitFailed": "Could not submit your request. Please try again.",
    "bannerTitleData": "Data deletion requested {{date}} — under review",
    "bannerTitleAccount": "Account deletion requested {{date}} — under review",
    "bannerBody": "We'll complete this by {{deadline}}.",
    "cancelRequest": "Cancel request",
    "cancelled": "Deletion request cancelled",
    "cancelFailed": "Could not cancel your request. Please try again."
  },
```

Add the same block, translated, to `ja/translation.json` and `bn/translation.json` — match the surrounding files' tone and existing `profileData.*` translations for terms like "Delete Financial Data" / "Delete Account" already present in each locale (search `type_deletion_request` in each file for the nearest existing translation of "deletion request" to stay consistent).

- [ ] **Step 2: Write the component**

```typescript
// src/components/DeletionRequestSheet.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BaseModalSheet,
  SheetBackdrop,
  SheetContainer,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetFooter,
} from '@/components/ui/base-modal-sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DELETION_REASONS, DeletionReason, DeletionScope } from '@/hooks/useDeletionRequest';

interface DeletionRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: DeletionScope;
  submitting: boolean;
  onConfirm: (reason: DeletionReason | null, detail: string) => Promise<boolean>;
}

export function DeletionRequestSheet({
  open,
  onOpenChange,
  scope,
  submitting,
  onConfirm,
}: DeletionRequestSheetProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<DeletionReason | null>(null);
  const [detail, setDetail] = useState('');

  const handleSubmit = async () => {
    const ok = await onConfirm(reason, detail);
    if (ok) {
      setReason(null);
      setDetail('');
      onOpenChange(false);
    }
  };

  return (
    <BaseModalSheet open={open} onOpenChange={onOpenChange} snapPoints={[0.85]}>
      <SheetBackdrop onClick={() => onOpenChange(false)} />
      <SheetContainer>
        <SheetHeader>
          <SheetTitle>
            {scope === 'account' ? t('deletionRequest.sheetTitleAccount') : t('deletionRequest.sheetTitleData')}
          </SheetTitle>
          <SheetClose />
        </SheetHeader>

        <SheetContent>
          <div className="px-4 py-4 space-y-5">
            <p className="text-sm text-muted-foreground">
              {scope === 'account' ? t('deletionRequest.explainAccount') : t('deletionRequest.explainData')}
            </p>

            <div className="space-y-2">
              <Label>{t('deletionRequest.reasonLabel')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {DELETION_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(reason === r ? null : r)}
                    aria-pressed={reason === r}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors text-left',
                      reason === r
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border/60 text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {t(`deletionRequest.reason_${r}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deletion-detail">{t('deletionRequest.detailLabel')}</Label>
              <Textarea
                id="deletion-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={t('deletionRequest.detailPlaceholder')}
                className="min-h-24"
                maxLength={2000}
              />
            </div>
          </div>
        </SheetContent>

        <SheetFooter>
          <Button
            className="w-full bg-destructive hover:bg-destructive/90"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? t('deletionRequest.submitting') : t('deletionRequest.submit')}
          </Button>
        </SheetFooter>
      </SheetContainer>
    </BaseModalSheet>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/DeletionRequestSheet.tsx src/i18n/locales/en/translation.json src/i18n/locales/ja/translation.json src/i18n/locales/bn/translation.json
git commit -m "Add DeletionRequestSheet with reason chips and free-text detail"
```

---

### Task 6: Rewire `DataPage.tsx`

**Files:**
- Modify: `src/pages/profile/DataPage.tsx`
- Modify: `src/i18n/locales/en/translation.json`, `ja/translation.json`, `bn/translation.json` (remove dead keys)

**Interfaces:**
- Consumes: `useDeletionRequest()` (Task 4), `DeletionRequestSheet` (Task 5), `formatDeletionRequestedDate`/`getDeletionDeadline` (Task 2).

- [ ] **Step 1: Remove the dead confirm-phrase i18n keys**

In `src/i18n/locales/en/translation.json` (and the matching lines in `ja`/`bn`), delete these four keys from the `"profileData"` block — they backed the "type DELETE to confirm" inputs, which no longer exist once the click only creates a reviewable request:
```json
    "typeDeleteConfirm": "Type DELETE to confirm",
    "typeDeleteAccountConfirm": "Type DELETE ACCOUNT to confirm",
    "deletePlaceholder": "DELETE",
    "deleteAccountPlaceholder": "DELETE ACCOUNT",
```
Keep `"deleteFinancialData"` and `"deleteAccount"` — still used as button/card labels.

- [ ] **Step 2: Replace the deletion logic in `DataPage.tsx`**

Remove entirely: the `deleteAllTableData`, `handleDeleteData`, `handleDeleteFullAccount` functions, and the state (`deleteLoading`, `deleteConfirmText`, `showDeleteDialog`, `deleteAccountLoading`, `deleteAccountConfirmText`, `showDeleteAccountDialog`). Replace the two `AlertDialog` blocks (Delete Financial Data card and Delete Account card) with a shared sheet, one `DeletionScope` state, and a pending-request banner.

Key edits to `src/pages/profile/DataPage.tsx`:

Replace the imports block (remove `AlertDialog*`, `Input`, unused `Trash2`/`UserX` stay since still used as icons; add new imports):
```typescript
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, UserX, AlertTriangle, FileJson, BarChart3, FileText, ChevronRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDataManagement } from '@/hooks/useDataManagement';
import { useDeletionRequest, DeletionScope, DeletionReason } from '@/hooks/useDeletionRequest';
import { DeletionRequestSheet } from '@/components/DeletionRequestSheet';
import { formatDeletionRequestedDate, formatDeletionDeadline } from '@/lib/deletionRequestBanner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
```
(Drop the `supabase` import and the `AlertDialog*`/`Input` imports — no longer used directly in this file.)

Replace the component body's state/handlers section (everything from `const [analyticsEnabled, ...` through the end of `handleDeleteFullAccount`) with:
```typescript
export function DataPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { exportData } = useDataManagement();
    const { pendingRequest, submitting, submitRequest, cancelRequest } = useDeletionRequest();
    const { toast } = useToast();

    const [analyticsEnabled, setAnalyticsEnabled] = useState(
        () => !localStorage.getItem(ANALYTICS_OPT_OUT_KEY),
    );
    const [loading, setLoading] = useState(false);
    const [sheetScope, setSheetScope] = useState<DeletionScope | null>(null);

    const handleExportAllData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const { csv, json } = await exportData();
            const stamp = format(new Date(), 'yyyy-MM-dd');
            downloadFile(`hisabify_export_${stamp}.json`, json, 'application/json');
            downloadFile(`hisabify_export_${stamp}.csv`, csv, 'text/csv');

            toast({ title: t('profileData.exportComplete'), description: t('profileData.exportCompleteDesc') });
        } catch {
            // useDataManagement already surfaced a destructive toast.
        }
        setLoading(false);
    };

    const handleToggleAnalytics = (enabled: boolean) => {
        setAnalyticsEnabled(enabled);
        if (enabled) {
            localStorage.removeItem(ANALYTICS_OPT_OUT_KEY);
        } else {
            localStorage.setItem(ANALYTICS_OPT_OUT_KEY, 'true');
        }
        toast({ title: enabled ? t('profileData.analyticsOn') : t('profileData.analyticsOff') });
    };

    const legalLinks = [
        { path: '/privacy', label: t('page.privacyPolicy') },
        { path: '/terms', label: t('page.termsConditions') },
    ];

    const handleConfirmDeletionRequest = async (reason: DeletionReason | null, detail: string) => {
        if (!sheetScope) return false;
        const ok = await submitRequest(sheetScope, reason, detail);
        if (ok) {
            toast({ title: t('deletionRequest.submitted'), description: t('deletionRequest.submittedDesc') });
        } else {
            toast({ title: t('deletionRequest.submitFailed'), variant: 'destructive' });
        }
        return ok;
    };

    const handleCancelRequest = async () => {
        const ok = await cancelRequest();
        toast(
            ok
                ? { title: t('deletionRequest.cancelled') }
                : { title: t('deletionRequest.cancelFailed'), variant: 'destructive' }
        );
    };
```
`logPrivacyAction` is dropped from the `useDataManagement()` destructure entirely: it was only ever called directly in this file from the two removed handlers (`handleDeleteData`, `handleDeleteFullAccount`). The export flow's own `logPrivacyAction('data_export')` call lives inside `exportData()` in `useDataManagement.ts` and is unaffected. Deletion-related audit entries are now written by `useDeletionRequest` (`deletion_requested`/`deletion_request_cancelled`) and by the edge function (`financial_data_deleted`/`account_deleted`), so nothing in `DataPage.tsx` calls `logPrivacyAction` any more.

Replace the pending-request banner: insert this directly above the `{/* ── Danger Zone ─── */}` block:
```tsx
                {pendingRequest && (
                    <motion.div
                        custom={3.5} variants={cardVariants} initial="hidden" animate="visible"
                        className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
                    >
                        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                {t(
                                    pendingRequest.scope === 'account'
                                        ? 'deletionRequest.bannerTitleAccount'
                                        : 'deletionRequest.bannerTitleData',
                                    { date: formatDeletionRequestedDate(pendingRequest.requested_at) }
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t('deletionRequest.bannerBody', {
                                    deadline: formatDeletionDeadline(pendingRequest.requested_at),
                                })}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                disabled={submitting}
                                onClick={handleCancelRequest}
                            >
                                {t('deletionRequest.cancelRequest')}
                            </Button>
                        </div>
                    </motion.div>
                )}
```

Replace the "Delete Data" `AlertDialog` trigger button (inside the amber Danger Zone card) with:
```tsx
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/60"
                            disabled={!!pendingRequest}
                            onClick={() => setSheetScope('data')}
                        >
                            Delete Data
                        </Button>
```

Replace the "Delete Account" `AlertDialog` trigger button (inside the red Danger Zone card) with:
```tsx
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            disabled={!!pendingRequest}
                            onClick={() => setSheetScope('account')}
                        >
                            Delete Account
                        </Button>
```

Add the sheet just before the closing `</main>`:
```tsx
            </main>

            {sheetScope && (
                <DeletionRequestSheet
                    open={!!sheetScope}
                    onOpenChange={(open) => !open && setSheetScope(null)}
                    scope={sheetScope}
                    submitting={submitting}
                    onConfirm={handleConfirmDeletionRequest}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. In particular confirm no leftover reference to `deleteConfirmText`, `showDeleteDialog`, `AlertDialog`, `supabase` (direct import), or `Input` remains in the file.

- [ ] **Step 4: Manual verification in the running app**

Run: `npm run dev`, sign in, navigate to `/profile/data`.
Expected:
- Clicking "Delete Data" or "Delete Account" opens the sheet with the correct scope's copy, reason chips, and free-text box; submitting with everything left blank succeeds (GDPR requirement — nothing may block a bare request).
- After submitting, the banner appears with the correct scope wording and today's date, and both Danger Zone buttons are disabled.
- "Cancel request" removes the banner and re-enables both buttons.

- [ ] **Step 5: Commit**

```bash
git add src/pages/profile/DataPage.tsx src/i18n/locales/en/translation.json src/i18n/locales/ja/translation.json src/i18n/locales/bn/translation.json
git commit -m "Replace instant delete actions with review-gated deletion requests"
```

---

### Task 7: `AdminPage.tsx` — queue, badge, approve action, readable columns

**Files:**
- Modify: `src/pages/AdminPage.tsx`

**Interfaces:**
- Consumes: `process-deletion-request` edge function (Task 3); `deletion_requests` table (Task 1).

- [ ] **Step 1: Add the table, pending-count badge, and per-row approve action**

`AdminPage.tsx` today is a fully generic, read-only renderer with no concept of a row action. This task deliberately makes `deletion_requests` the one exception, with a comment explaining why (per the design spec) so it isn't "cleaned up" back to fully generic later.

Replace the top of the file (imports, constants) with:
```typescript
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Mirrors the allowlist in public.is_admin() — see
// supabase/migrations/20260729000100_add_admin_read_access.sql. RLS is the real gate;
// this only decides whether to bother rendering the page.
const ADMIN_EMAILS = ['scode43@gmail.com'];

// Adding a table here is the whole cost of adding it to the panel for plain viewing — the
// view builds its columns from whatever comes back. deletion_requests is the one exception:
// it also gets a per-row Approve action and non-generic column rendering below, because it's
// the only table in this panel with a lifecycle a human needs to act on. Don't generalize that
// into every table — it's deliberately special-cased.
const TABLES = ['app_feedback', 'user_behavior_events', 'deletion_requests'] as const;
type TableName = (typeof TABLES)[number];

const ROW_LIMIT = 100;
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
};

type Row = Record<string, unknown>;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}
```

- [ ] **Step 2: Add pending-count fetching and the approve handler**

Replace the component body's state/effects section (everything from `export function AdminPage()` through the `useEffect` that calls `fetchRows`) with:
```typescript
// Not translated: internal tool, single operator. ponytail: i18n it if support staff ever use it.
export function AdminPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);

  const [table, setTable] = useState<TableName>('app_feedback');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from(table as 'app_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(ROW_LIMIT);

    if (queryError) setError(queryError.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [table]);

  // Runs regardless of which tab is selected — it's the one signal that the
  // 30-day response clock is running on an unreviewed request.
  const fetchPendingCount = useCallback(async () => {
    const { count } = await supabase
      .from('deletion_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingCount(count ?? 0);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchRows();
  }, [isAdmin, fetchRows]);

  useEffect(() => {
    if (isAdmin) fetchPendingCount();
  }, [isAdmin, fetchPendingCount]);

  const handleApprove = useCallback(
    async (requestId: string) => {
      setApprovingId(requestId);
      const { error: invokeError } = await supabase.functions.invoke('process-deletion-request', {
        body: { requestId },
      });
      setApprovingId(null);

      if (invokeError) {
        setError(invokeError.message);
        return;
      }
      await fetchRows();
      await fetchPendingCount();
    },
    [fetchRows, fetchPendingCount],
  );
```

- [ ] **Step 3: Custom rendering for `deletion_requests` — table selector badge, non-truncated `detail`, status badge, approve column**

Replace the table selector buttons row (the `{TABLES.map(...)}` block) with a version that shows the pending badge on the `deletion_requests` tab:
```tsx
        <div className="flex flex-wrap items-center gap-2">
          {TABLES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTable(name)}
              aria-pressed={table === name}
              className={cn(
                'rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                table === name
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border/60 text-muted-foreground hover:bg-muted/50'
              )}
            >
              {name}
              {name === 'deletion_requests' && pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchRows}
            disabled={loading}
            aria-label="Refresh"
            className="ml-auto"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
```

Replace the table body rendering (`{rows.length > 0 && (...)}`) with a version that: adds an Approve column only for `deletion_requests`, renders `status` as a colored badge instead of plain truncated text, and lets `detail` wrap instead of truncating:
```tsx
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {column}
                    </th>
                  ))}
                  {table === 'deletion_requests' && (
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">action</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-border/40 align-top">
                    {columns.map((column) => {
                      if (table === 'deletion_requests' && column === 'status') {
                        const status = String(row[column]);
                        return (
                          <td key={column} className="px-3 py-2">
                            <span
                              className={cn(
                                'inline-block rounded-full border px-2 py-0.5 font-semibold whitespace-nowrap',
                                STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground border-border'
                              )}
                            >
                              {status}
                            </span>
                          </td>
                        );
                      }

                      if (table === 'deletion_requests' && column === 'detail') {
                        const text = formatCell(row[column]);
                        return (
                          <td key={column} className="px-3 py-2 max-w-sm whitespace-pre-wrap break-words">
                            {text}
                          </td>
                        );
                      }

                      const text = formatCell(row[column]);
                      return (
                        <td key={column} className="px-3 py-2" title={text}>
                          <span className="block max-w-[24rem] truncate">{text}</span>
                        </td>
                      );
                    })}
                    {table === 'deletion_requests' && (
                      <td className="px-3 py-2">
                        {row.status === 'pending' ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={approvingId === row.id}
                            onClick={() => handleApprove(row.id as string)}
                          >
                            {approvingId === row.id ? 'Approving…' : 'Approve & delete'}
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {String(row.status)}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification locally against real Supabase**

Run: `npm run dev`, sign in as `scode43@gmail.com`, navigate to `/admin`.
Expected (per the design spec's explicit UI/UX requirement — this must be checked live, not just visually inspected in isolation):
- The `deletion_requests` tab shows a red count badge matching the number of pending rows.
- Selecting the tab shows a `status` column rendered as a colored pill (amber for pending, muted for cancelled, green for completed) — not indistinguishable plain text.
- The `detail` column wraps long free text instead of clipping it with an ellipsis, and is readable without hovering for a tooltip.
- Both the pending-count badge and the `Approve & delete` button are visible without horizontal scrolling on a standard laptop width, even with all `deletion_requests` columns present.
- Clicking `Approve & delete` on a pending row: the button shows "Approving…", then on completion the row's status flips to a green "completed" badge and the pending-count badge decrements — no silent success with a stale-looking table.

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdminPage.tsx
git commit -m "Add deletion_requests queue to /admin with approve action"
```

---

### Task 8: Legal content, subscription terms, and `CLAUDE.md`

**Files:**
- Modify: `src/lib/legalContent.tsx`
- Modify: `src/components/SubscriptionTermsContent.tsx`
- Modify: `/Users/sam/Documents/GitHub/hisabify/CLAUDE.md`

**Interfaces:**
- None — documentation-only changes, no code interfaces.

- [ ] **Step 1: Update Terms of Service §9 (Termination) — `src/lib/legalContent.tsx` around line 164-168**

Replace:
```tsx
        <p>
          <strong>Your Right:</strong> You may delete your account at any time from Profile →
          Data Management. Upon deletion, all personal data is permanently removed within 30
          days.
        </p>
```
with:
```tsx
        <p>
          <strong>Your Right:</strong> You may request account deletion at any time from Profile
          → Data &amp; Privacy. Requests are reviewed manually; upon approval, all personal data
          is permanently removed within 30 days of your original request, with backup copies
          purged within 90 days.
        </p>
```

- [ ] **Step 2: Update Terms of Service §11 (Changes to Terms) — around line 185-188**

Replace:
```tsx
        <p>
          If you disagree with updated Terms, you may request data deletion within 30 days of
          the change notification. See our Privacy Policy for data deletion procedures.
        </p>
```
with:
```tsx
        <p>
          If you disagree with updated Terms, you may request data deletion within 30 days of
          the change notification. See our Privacy Policy for the data deletion request
          procedure.
        </p>
```

- [ ] **Step 3: Update Privacy Policy §8 (Right to Erasure) — around line 455-458**

Replace:
```tsx
        <p>
          <strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your
          account and all data. Go to Settings → Data Management → Delete Account or email
          "Erasure Request". Response: 30 days. Data deleted: Within 30 days. Exceptions: Data
          required by law (tax records).
        </p>
```
with:
```tsx
        <p>
          <strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your
          data or account from Profile → Data &amp; Privacy, or email us with "Erasure Request".
          Requests are reviewed manually rather than actioned instantly; your account remains
          fully usable, and the request cancellable, until then. Response: 30 days. Data
          deleted: within 30 days of your request. Backup copies: purged within 90 days.
          Exceptions: data required by law (tax records).
        </p>
```

- [ ] **Step 4: Update Privacy Policy §9 (Data Retention) — around line 483-486**

Replace:
```tsx
        <p>
          <strong>After Account Deletion:</strong> Personal data (email, name, password): 30
          days. Financial data: 30 days. Backup copies: 90 days. Legal/tax records: 7 years
          (legal requirement). Anonymised aggregate data: Indefinitely.
        </p>
```
with:
```tsx
        <p>
          <strong>After a Deletion Request is Approved:</strong> Personal data (email, name,
          password): 30 days. Financial data: 30 days. Backup copies: 90 days. Legal/tax
          records: 7 years (legal requirement). Anonymised aggregate data: indefinitely. The
          30/90-day windows are measured from when you submitted the request, not from when it
          was approved.
        </p>
```

- [ ] **Step 5: Update `SubscriptionTermsContent.tsx` §7 (Account Deletion & Premium Credits) — around line 178-181**

Replace:
```tsx
        <p>
          <strong>No Recovery:</strong> Once your account is deleted, credits cannot be
          recovered. Deletion is permanent within 30 days.
        </p>
```
with:
```tsx
        <p>
          <strong>No Recovery:</strong> Once a deletion request is approved, credits cannot be
          recovered. Deletion is permanent within 30 days of your original request.
        </p>
        <p>
          <strong>Store Subscriptions:</strong> Deleting your account does not cancel an active
          Google Play or App Store subscription, and does not trigger a refund. Cancel your
          subscription separately through the store before requesting deletion if you want to
          stop being billed.
        </p>
```

- [ ] **Step 6: Rewrite `CLAUDE.md`'s account-deletion section**

In `/Users/sam/Documents/GitHub/hisabify/CLAUDE.md`, find the paragraph starting `**Account deletion is immediate and irreversible.**` (in the "Legal Documents & Data Privacy" section). Replace the entire paragraph — not append to it — with:
```markdown
**Account deletion is manual and review-gated, not instant.** `/profile/data` (`DataPage.tsx`) no
longer deletes anything on click. Both "Delete Financial Data" and "Delete Account" open
`DeletionRequestSheet`, which inserts a row into `deletion_requests` (optional exit reason +
free-text detail — GDPR Art. 12 requires erasure requests to be actionable without answering
anything). The account stays fully usable, and the request cancellable, until an admin approves
it in `/admin`, which invokes `supabase/functions/process-deletion-request` — the single
authoritative wipe covering every user-scoped table and both storage buckets (`receipts`,
`feedback-attachments`).

This replaced an instant, client-side delete (`deleteAllTableData()` + the `delete-user` edge
function) for two reasons: it only wiped 7 of 15+ user-scoped tables, and instant deletion gave
no chance to capture why a user was leaving. It does **not** reintroduce the soft-delete/grace-
period this file used to warn against — that warning's reasoning (a soft-delete without a purge
job means data is never actually deleted) still holds, and still applies here: there is a real
purge (`process-deletion-request`), it is triggered by a human clicking Approve, not a background
job that can silently stop running (see the payment-reminder-cron incident referenced under
Recurring Transactions), and the `deletion_requests` row is anonymised (`user_id`/`email` nulled)
on fulfilment rather than kept indefinitely tied to an identity. `audit_log` remains the
permanent, non-anonymised record that erasure happened, for exactly the reason it was built.

Do not re-add a client-side wipe-table list anywhere — `process-deletion-request`'s table list is
the only one, specifically because a second list is how the 7-of-15 gap happened the first time.
```

- [ ] **Step 7: Verify no other doc references the removed `delete-user` function or the old instant-delete copy**

Run: `grep -rn "delete-user\|Data Management → Delete Account\|Settings → Data Management" src/lib/legalContent.tsx src/components/SubscriptionTermsContent.tsx TRD.md PRD.md 2>/dev/null`
Expected: no remaining hits pointing at the old function name or the stale `Settings → Data Management` path (current path is `Profile → Data & Privacy`). Fix any found in `TRD.md`/`PRD.md` inline if they exist.

- [ ] **Step 8: Commit**

```bash
git add src/lib/legalContent.tsx src/components/SubscriptionTermsContent.tsx CLAUDE.md TRD.md PRD.md
git commit -m "Update legal copy and CLAUDE.md for review-gated deletion requests"
```

---

## Post-implementation checklist

- [ ] `npm run lint` passes
- [ ] `npm test` passes (in particular `deletionRequestBanner.test.ts`)
- [ ] `npx tsc --noEmit` passes
- [ ] Manual pass through the full user flow: submit a data-deletion request → see banner → cancel → banner disappears → submit an account-deletion request → approve in `/admin` → confirm the account's data is gone and (for account scope) the user can no longer sign in.
- [ ] Confirm `supabase/functions/delete-user` no longer exists in the repo or the deployed function list.
