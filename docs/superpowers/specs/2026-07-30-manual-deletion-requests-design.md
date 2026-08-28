# Manual Deletion Requests: Design

**Date:** 2026-07-30
**Branch:** feat/delete-functionalities-recap

## Problem

Both "Delete Financial Data" and "Delete Account" on `/profile/data` (`DataPage.tsx`)
are currently instant and self-service: type a confirmation phrase, click, and the
wipe (and for account deletion, the `delete-user` edge function) runs immediately
with no human in the loop.

We want to:
1. Collect an exit reason and free-text feedback before a user leaves.
2. Turn deletion into a **manual, reviewed** process — nothing destructive happens
   until an admin approves it.
3. Commit to response windows: data deleted within 30 days, backups purged within
   90 days (see "Retention wording" below — this reframes, not changes, the
   existing policy).
4. Fix a real gap found while reading the current code: `deleteAllTableData()` in
   `DataPage.tsx` only wipes 7 tables. The schema has 15+ user-scoped tables plus
   two storage buckets (`receipts`, `feedback-attachments`). Today's "Delete
   Account" leaves rows behind in `debts`, `activity_log`, `notifications`,
   `fcm_tokens`, `subscriptions`, `account_types`, `custom_category_user_log`,
   `app_feedback`, `user_behavior_events`, `users`, and both buckets. This is
   folded into this work rather than fixed separately, because the new admin
   fulfilment function is the authoritative wipe either way.

## Decisions made during brainstorming

- **Scope:** both existing actions ("Delete Financial Data" and "Delete Account")
  become requests. Neither destroys anything on click anymore.
- **Pending-state UX:** account stays fully usable. A banner on `DataPage` shows
  the request and a **Cancel request** button. Both Danger Zone buttons disable
  while a request is pending.
- **Survey fields:** reason (single-select chips) and free-text detail. Both
  optional/skippable — GDPR Art. 12 requires erasure requests to be actionable
  without answering anything.
- **Storage:** new `deletion_requests` table with a real status lifecycle
  (`pending` → `cancelled` | `completed`). Not reusing `app_feedback` (append-only,
  no UPDATE policy, wrong CHECK shape for a skippable survey).
- **Fulfilment:** an **Approve & delete** action added to `/admin`
  (`AdminPage.tsx`), calling a new edge function that verifies `is_admin()`,
  performs the full wipe, and (for account scope) deletes the `public.users` row
  and the auth user.
- **Notification:** none. No email infra exists in this repo (no Resend/SMTP
  function), and `LEGAL_CONTACT_EMAIL` is a bare Gmail address that most
  providers won't let you send *from*. Admin checks `/admin` directly; a
  pending-count badge is the only concession to the fact that the 30-day clock
  starts silently.
- **No reject path.** Erasure requests cannot be lawfully refused outright, so
  `status` only ever moves `pending → cancelled` (by the user) or
  `pending → completed` (by the admin).
- **`delete-user` edge function is deleted.** Once deletion is admin-initiated,
  nothing calls it, and leaving a live self-service instant-delete endpoint next
  to a reviewed flow means the app has two contradictory answers to "is my
  account gone?" (a concern `useDataManagement.ts` already documents for the
  soft-delete case).
- **Wipe list gap is fixed as part of this work** — the new edge function is the
  single authoritative wipe, covering every user-scoped table, not the 7 the old
  client-side list had.

## Data model

```sql
create table public.deletion_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,          -- nulled on fulfilment (see "Anonymisation")
  email         text,          -- snapshot; nulled on fulfilment
  scope         text not null check (scope in ('data','account')),
  status        text not null default 'pending'
                  check (status in ('pending','cancelled','completed')),
  reason        text,          -- chip value; null if skipped
  detail        text,          -- free text; null if skipped
  requested_at  timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   text           -- admin email
);

-- One pending request per user — makes the banner query single-row and
-- prevents duplicate submissions without any client-side guard.
create unique index deletion_requests_one_pending
  on public.deletion_requests (user_id) where status = 'pending';

alter table public.deletion_requests enable row level security;

-- Insert own row, forced pending (client cannot insert a pre-completed row)
create policy "Users can request their own deletion"
  on public.deletion_requests for insert
  with check (auth.uid() = user_id and status = 'pending');

-- Read own rows, or admin reads all (for the /admin queue)
create policy "Users can view own deletion requests"
  on public.deletion_requests for select
  using (auth.uid() = user_id or public.is_admin());

-- Cancel is the only mutation a user can make; pending -> cancelled only.
create policy "Users can cancel their own pending request"
  on public.deletion_requests for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'cancelled');
```

`audit_log`'s `action` CHECK gains two values: `'deletion_requested'`,
`'deletion_request_cancelled'`. Fulfilment still writes the existing
`'financial_data_deleted'` / `'account_deleted'` values.

### Anonymisation on fulfilment

The exit-survey text (`reason`, `detail`) is worth keeping for churn insight
longer than the account exists, but retaining a departed user's free text tied to
their identity is itself a retention violation. On fulfilment, the edge function
nulls `user_id` and `email` on the row — `deletion_requests` becomes the
anonymous aggregate signal, `audit_log` (already orphaned-by-design per its own
migration comment) remains the per-user evidence that erasure happened.

## User-facing flow (`DataPage.tsx`)

Both Danger Zone cards keep their current copy/colour (amber = data, red =
account), but the `AlertDialog` in each is replaced by a shared
`DeletionRequestSheet` opened with a `scope` prop.

Sheet contents:
- Plain-language explanation of what the chosen scope removes.
- Reason chips (single-select, optional): too expensive, missing features, found
  a better app, privacy concerns, not using it, too complicated, other.
- Free-text detail textarea (optional).
- One button: **Request deletion**.

The existing "type DELETE / DELETE ACCOUNT to confirm" inputs are removed. They
existed to guard an instantly destructive click; once the click only creates a
reviewable request, that friction guards nothing and is dropped.

On submit: insert into `deletion_requests`, write `deletion_requested` to
`audit_log`, toast, close. No sign-out — the account stays live.

While a pending request exists for the user, `DataPage` renders a banner above
the Danger Zone: *"Account deletion requested \<date> — under review. We'll
complete this within 30 days."* with a **Cancel request** button (updates
`status` to `'cancelled'`, logs `deletion_request_cancelled`). Both Danger Zone
buttons are disabled while pending.

No banner elsewhere in the app (e.g. dashboard) — a user who forgets about the
request is not at risk, because nothing happens without admin approval.

## Fulfilment (`/admin`)

`AdminPage.tsx` today is a fully generic, read-only row renderer — no row has an
action of any kind. Adding `'deletion_requests'` to the `TABLES` array is free
(per the file's own comment), but the approval action is new capability, not
free, and needs real code:
- A pending-count badge, since nothing else signals that a legal clock is
  running.
- When `table === 'deletion_requests'`, render one extra column with an
  **Approve & delete** button on rows where `status === 'pending'` (no button
  on `cancelled`/`completed` rows). This is the one place the component stops
  being table-agnostic — worth a short comment explaining why, so it doesn't
  get "cleaned up" back to fully generic later.

**Verified locally against real Supabase, not just visually inspected.**
`/admin` is reachable at `localhost:8080/admin` (or `npm run dev:managed` for
device testing) under the signed-in admin user, and `fetchRows()` already
queries the live project on demand (no mocking) — so this is testable in a
normal dev session, not just in production. Confirm during implementation:
- The generic cell renderer truncates every column to
  `max-w-[24rem] truncate` (`AdminPage.tsx:143`). `detail` is free text up to
  whatever length the sheet allows and **must not** be silently clipped with no
  way to read the rest — at minimum the existing `title={text}` tooltip must
  actually surface the full text on hover/tap, or `detail` needs its own
  non-truncated treatment (e.g. wrap instead of truncate for that one column).
- `status` should be visually distinguishable at a glance (e.g. pending rows
  and their Approve button should not blend into a wall of monospace text) —
  a color-coded badge, not another plain truncated cell.
- Confirm the pending-count badge and the Approve button are both visible
  without horizontal scrolling on a typical laptop viewport, given the table
  already scrolls (`overflow-x-auto`) once several columns are present.
- After clicking Approve & delete, the row must refresh (or the badge count
  drop) so the admin gets immediate visual confirmation the action landed —
  no silent success.

New edge function `process-deletion-request`:

**Input:** `{ requestId: string }`

1. Build a Supabase client from the caller's JWT (not service role) and call
   `select public.is_admin()`. Reject if false or errored. This keeps the admin
   allowlist single-sourced in the SQL function rather than duplicated into a
   third place (it's already duplicated once, into `AdminPage.tsx`'s
   `ADMIN_EMAILS` constant, per existing project convention — see CLAUDE.md's
   Admin Panel section).
2. Re-fetch the request with the service-role client; abort with an error if
   `status !== 'pending'` (handles double-clicks / concurrent admin sessions).
3. Run the wipe for `scope`:
   - **`data` scope:** `transactions`, `budgets`, `cards`, `savings_goals`,
     `payment_reminders`, `recurring_expenses`, `report_templates`, `debts`,
     `activity_log`, `custom_category_user_log`, `notifications`, and all
     objects under `receipts/{user_id}/` in storage.
   - **`account` scope:** everything in `data` scope, **plus** `users`,
     `subscriptions`, `fcm_tokens`, `account_types`, `app_feedback`,
     `user_behavior_events`, and all objects under
     `feedback-attachments/{user_id}/` in storage; then
     `auth.admin.deleteUser(user_id)`.
   - `users` row is matched on `user_id`, never `id` (per the existing
     surrogate-PK gotcha documented in CLAUDE.md).
   - `deletion_requests` and `audit_log` are never wiped by this function —
     `audit_log` is permanent evidence; `deletion_requests` is anonymised
     instead (next step), not deleted, so the aggregate survey signal survives.
4. Insert `financial_data_deleted` or `account_deleted` into `audit_log`
   (`user_id` still resolvable at this point — this happens before step 5).
5. Update the `deletion_requests` row: `status = 'completed'`,
   `resolved_at = now()`, `resolved_by = <admin email>`, `user_id = null`,
   `email = null`.

`supabase/functions/delete-user/` is deleted — see "Decisions" above.

## Legal & documentation updates

- `src/lib/legalContent.tsx` §8 (Right to Erasure): update the stale path
  (`Settings → Data Management` is now `Profile → Data & Privacy`), state that
  requests go through review, that the account remains usable and the request
  cancellable until fulfilled, and that a store (Play/App Store) subscription is
  **not** cancelled by account deletion — the user must cancel it separately.
  Keep "Response: 30 days."
- §9 (Data Retention): wording already states 30 days data / 90 days backups
  correctly. Add one sentence: the retention clock starts at the *request*
  (`requested_at`), not at admin approval.
- `src/components/SubscriptionTermsContent.tsx` (~line 180, "Deletion is
  permanent within 30 days"): add the same store-subscription caveat.
- Bump `LEGAL_LAST_UPDATED`.
- New i18n keys (`en`, `ja`, `bn`) for: sheet copy, reason chip labels, the
  pending banner, and the cancel button.
- **`CLAUDE.md`'s "Account deletion" section must be rewritten, not appended.**
  It currently instructs future sessions *not* to build a grace period, reasoning
  that "a soft-delete without a purge job means data is never actually deleted."
  That reasoning is still correct and must be preserved — the new text needs to
  explain why this is different: there **is** a purge (the edge function), a
  **human** performs it (not a background job that can silently stop, as the
  CLAUDE.md payment-reminder-cron story warns happened before), and the request
  row is anonymised rather than kept indefinitely identified. Without this
  rewrite, a future session reading the old wording will "fix" this by reverting
  it.
- Update `TRD.md` / `PRD.md` if they reference account deletion (check during
  implementation).

## Explicitly out of scope

- Email notification of new requests (no email infra in repo today).
- Read-only lockout of the account while pending.
- Automatic/cron-based purge — approval is a manual click, by design, so the
  purge is directly attributable to a human decision.
- "Would you come back?" / contact-consent survey fields — trimmed from the
  original ask to reason + free text only.
- A reject path — erasure requests are not something we can lawfully refuse.
- Any change to `audit_log`'s existing structure beyond the two new CHECK
  values.

## Testing notes for the implementation plan

- Pure logic to unit test: the `deletion_requests` status-transition guard
  (client cannot flip `pending → completed`, only `pending → cancelled`) —
  covered by RLS, but worth a Vitest-level check on whatever hook wraps the
  insert/cancel calls, mirroring the existing `ratingPrompt.test.ts` style of
  testing pure decision logic separately from the component.
- The wipe-table list in the edge function should be the one place it's
  defined — no parallel list drifting in a hook, matching the lesson from the
  bug this design fixes.
