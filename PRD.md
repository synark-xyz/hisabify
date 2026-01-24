**Product Requirements Document**

- **Project**: Hisabify (personal finance manager)
- **Repository**: synark-xyz/my-wallet
- **Document owner**: Product — GitHub Copilot (initial draft)

**Purpose**: Provide a lightweight, privacy-first mobile-first web app to let individual users track cards, expenses, budgets, and recurring payment reminders with simple analytics.

**Problem Statement**: Many users lack a single, simple app to track multiple cards/accounts, recurring payments and visualize spending trends without heavy complexity or exposing data to third parties.

**Target Users**
- **Primary**: Individuals who manage multiple credit/debit cards and want a simple ledger + reminders.
- **Secondary**: Freelancers and small households needing shared visibility into expenses.

**Business Goals & Success Metrics**
- **Activation**: New users complete adding at least one card and one transaction within first session. (Target: 60% in 7 days)
- **Retention**: 30-day retention above 20%.
- **Engagement**: Weekly active users > 15% of signups; average monthly transactions per active user >= 20.
- **Reliability**: 99.9% uptime for core flows.

**Core Features (MVP)**
- **Authentication**: Sign-up / sign-in (email) and session management.
- **Cards management**: Add, edit, and remove cards with basic metadata.
- **Transactions**: Create, edit, delete transactions; tag with categories.
- **Budgets & Overviews**: Per-month expense summaries and simple budgets.
- **Payment reminders**: Create recurring payment reminders and a carousel to view upcoming reminders.
- **Analytics**: Basic charts (donut, line) for spending by category and trend over time.
- **Mobile-first UI**: Responsive components, bottom navigation, calendar and month selector.
- **Local UX niceties**: Inline validation, modals for quick add/edit, skeletons & toasts.

**Feature List (module-separated)**

- **Authentication & Profile**
	- Sign up / Sign in (email + magic link)
	- Password reset
	- User profile (display name, timezone, currency)
	- Multi-factor auth (future)

- **Cards & Accounts**
	- Add / edit / delete card or account
	- Card metadata (nickname, type, last4)
	- Card grouping/tagging
	- Add more than one card (premium) **[PREMIUM]**
	- Import cards via CSV (premium) **[PREMIUM]**

- **Transactions**
	- Create / edit / delete transactions
	- Assign transaction to card/account
	- Categories and sub-categories
	- Attach notes and receipts (image upload) **[PREMIUM]**
	- Bulk CSV import (premium) **[PREMIUM]**
	- Auto-categorization (future/ML)

- **Budgets & Goals**
	- Create monthly budgets per category
	- Track progress vs budget
	- Create monthly budgets per category
	- Track progress vs budget
	- Create savings goals (single goal free)
	- More than one savings goal (premium) **[PREMIUM]**
	- Alerts when nearing or exceeding budget (push/email) **[PREMIUM]**


 - **Planner**
	- Create a financial plan (one active plan free)
	- Create more than one plan (premium) **[PREMIUM]**

- **Payment Reminders & Bills**
	- Create recurring reminders (daily/weekly/monthly)
	- Upcoming reminders carousel
	- Snooze or dismiss reminders
	- Payment scheduling with calendar sync (premium) **[PREMIUM]**

- **Analytics & Reporting**
	- Monthly spend overview (line chart)
	- Category distribution (donut chart)
	- Export reports to CSV/PDF (premium) **[PREMIUM]**
	- Custom date range comparisons (premium) **[PREMIUM]**

- **Notifications & Alerts**
	- In-app toasts for transactions and reminders
	- Email notifications for critical alerts
	- Push notifications (mobile/web) **[PREMIUM]**

- **Integrations & Sync**
	- Supabase backend (auth + DB)
	- Third-party calendar sync (read-only) **[PREMIUM]**
	- Bank sync / transaction import (out-of-scope for MVP)

- **Settings & Admin**
	- Account settings (currency, region, locale)
	- Data export / delete
	- Privacy controls

- **Collaboration & Sharing**
	- Export CSV / share reports via link **[PREMIUM]**
	- Shared wallet / household accounts (future)

- **Offline & Sync**
	- Basic caching for faster loads
	- Offline creation with local queue and sync (future / premium) **[PREMIUM]**

- **UX / Platform**
	- Mobile-first responsive UI
	- Keyboard accessibility and screen-reader support
	- Dark mode

**Premium features notation**: Features marked with **[PREMIUM]** are intended for a paid tier. Consider gating these behind subscription checks in the backend and the UI.

**User Stories (examples)**
- As a user, I want to add a credit card with a nickname so I can separate spending per card.
- As a user, I want to add a transaction and assign a category so I can see spending summaries.
- As a user, I want to set a recurring payment reminder so I don’t miss bills.
- As a user, I want to view a monthly spending chart to compare months.

**Non-functional Requirements**
- **Performance**: UI actions should feel instantaneous; charts load under 300ms for typical small datasets.
- **Security**: No plaintext secrets in the client; use Supabase auth and RBAC for server functions.
- **Privacy**: Minimize third-party telemetry by default; provide clear data export/deletion paths.
- **Accessibility**: Basic WCAG AA support for core flows.

**Assumptions & Constraints**
- Supabase is used as the BaaS (present in codebase). Data model is Postgres-backed.
- App is a SPA built with TypeScript + React + Vite.

**MVP Acceptance Criteria**
- Users can sign up and persist at least one transaction to the server.
- Users can view monthly summary charts and a list of upcoming reminders.
- Basic CRUD for cards, transactions, and reminders works across refresh.

**Out-of-scope for MVP**
- Multi-user shared wallets with complex permissions.
- Bank syncing (Plaid) and automatic transaction import.
- Complex forecasting or machine-learning categorization.

**Roadmap (next releases)**
- v1 (MVP): Core features above, deploy to staging.
- v2: Data export/import, user settings, basic CSV import.
- v3: Bank feed integrations, shared wallets, advanced analytics.

**Risks & Mitigations**
- **Risk**: User data loss on client-side failures — mitigate with server-side persistence and transactional writes.
- **Risk**: Regulatory/privacy concerns — mitigate with clear privacy policy and minimal telemetry.

**Open Questions**
- Do we need multi-device offline sync for MVP? (Recommendation: postpone to v2.)
- Are there required currency-conversion accuracy/legal constraints for certain markets?

**References**
- Codebase: `src/` (React + TypeScript + components, hooks, integrations/supabase)
- Design: existing Tailwind-based components and UI primitives under `src/components/ui/`.
