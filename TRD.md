**Technical Requirements & Design (TRD)**

- **Project**: My Wallet
- **Repository**: synark-xyz/my-wallet

**Overview**
This document outlines the current tech stack, architecture, data model guidance, APIs, infra, testing and operational concerns for the My Wallet project.

**Current Tech Stack (observed)**
- **Language**: TypeScript
- **Frontend**: React (TSX) + Vite
- **Styling**: Tailwind CSS
- **UI primitives**: Reusable components in `src/components/ui/` and app components in `src/components/`
- **Backend/BaaS**: Supabase (Postgres + Auth + Functions) — `integrations/supabase/` exists
- **Charts**: custom chart components (e.g., `AnalyticsChart.tsx`, `ExpenseDonutChart.tsx`)

**Recommended Architecture**
- **Client**: SPA built with Vite + React + TypeScript. Keep business logic in hooks (`src/hooks/`).
- **Server**: Supabase Postgres with Row-Level Security (RLS) and serverless functions for restricted operations.
- **Data model (high-level)**:
  - `users` (supabase auth)
  - `cards` (id, user_id, name, type, last4, metadata)
  - `transactions` (id, user_id, card_id, amount, currency, category, date, notes)
  - `reminders` (id, user_id, title, cron/rrule, amount?, next_date)
  - `budgets` (id, user_id, category, limit, period)

**API & Integration Patterns**
- Use Supabase client libraries from the frontend for direct, authenticated reads/writes where allowed by RLS.
- Use Supabase Edge Functions for operations that require elevated privileges (bulk operations, webhooks, scheduled tasks).
- Use prepared statements and batched writes for multi-record operations.

**Realtime & Sync**
- Supabase Realtime channels can power live updates between devices.
- For offline support (future): use local DB (IndexedDB) sync with conflict resolution strategy (last-writer-wins or vector-timestamp depending on complexity).

**Authentication & Authorization**
- Supabase Auth (email/password / magic links). Protect per-user data via RLS policies.
- Implement refresh/token handling via Supabase client; avoid storing secrets in client code.

**Observability & Monitoring**
- Client: Sentry (optional, opt-in to respect privacy) or lightweight error reporting; capture exceptions, feature-flagged telemetry.
- Server: Monitor Supabase metrics, DB connections, Edge Function errors.

**Testing Strategy**
- **Unit**: Jest or Vitest for hooks and pure utils under `src/hooks/` and `src/lib/utils.ts`.
- **Integration**: Playwright or Cypress for end-to-end flows (auth, add transaction, reminders).
- **Lint/Formatting**: ESLint + Prettier; ensure TypeScript strict mode on for safety.

**CI/CD & Releases**
- Use GitHub Actions to run lint, typecheck, tests and build. Deploy to Vercel/Netlify or static hosting with serverless supabase functions configured.
- Maintain staging and production branches; run DB migrations via `supabase` CLI or migration tooling stored in `supabase/migrations/`.

**Security Considerations**
- Enforce RLS for all tables with policies limited to `auth.uid()` owner checks.
- Sanitize and validate any user-generated content on server functions.
- Use environment secrets in the hosting provider and do not commit them.

**Performance & Scaling**
- Index frequently queried columns (user_id, date, card_id, category) to keep dashboard queries fast.
- Archive or partition historical transactions older than N years if dataset grows large.

**Data Migration & Backup**
- Use Supabase migrations (already present under `supabase/migrations/`).
- Schedule regular DB backups and test restore procedures.

**Dependencies & Libraries (observed / recommended)**
- Observed: React, Vite, Tailwind, Supabase client.
- Recommended additions: `vitest` (testing), `eslint` + configs, `prettier`, `playwright` (E2E), `sentry-sdk` optional.

**Developer Experience**
- Provide local `.env.example`, README with local dev steps (`pnpm`/`npm`/`bun` depending on project). Document Supabase project config and required environment variables.

**Open Technical Decisions**

**Subscription & Premium gating**

- **Payment provider**: Use Stripe for subscription billing and invoicing. Alternative: Paddle for simplified tax handling in some regions.
- **Data model**: add `subscription_tier`, `stripe_subscription_id`, `subscription_status`, `trial_ends_at` fields to the `users` table (migration stored in `supabase/migrations/`).
- **Feature gating**:
  - Represent entitlement checks server-side via RLS policies and a small `user_features` view or policy that maps `subscription_tier` to allowed features.
  - For sensitive operations (exports, receipt upload, bulk import) require Edge Function or RPC that verifies `subscription_status` before proceeding.
  - Client should hide or disable premium UI paths when the user is not entitled; always enforce on server.
- **Webhooks & sync**:
  - Configure Stripe webhooks to update Supabase user subscription fields on events (`invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`).
  - Verify webhook signatures and persist idempotently (use `stripe_event_id` table to de-duplicate).
- **Edge Functions & Billing**:
  - Implement an Edge Function to create checkout sessions and handle secure server-side operations (apply promo codes, create trials).
  - Keep secret Stripe keys in the host environment; never embed them in client bundles.
- **Client flow**:
  - Fetch `subscription_tier` as part of user profile on app load. Cache locally and refresh after billing changes.
  - Use optimistic UI for upgrade flows but rely on server verification for gated features.
- **Testing & QA**:
  - Add unit tests for entitlement logic and integration tests for webhook handling.
  - Add E2E tests for purchase, upgrade, downgrade, trial expiration, and access denial to premium features.
- **Metrics & reporting**:
  - Emit events for subscription lifecycle (created, upgraded, canceled, failed) to analytics pipeline (opt-in).

**Next Immediate Tech Tasks**
- Add unit tests for `src/hooks/useExchangeRate.ts` and `src/lib/utils.ts`.
- Add GitHub Actions for lint, typecheck, tests and build, with deploy step to chosen host.
