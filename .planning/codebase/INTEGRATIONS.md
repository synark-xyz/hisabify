# External Integrations

**Analysis Date:** 2025-03-19

## APIs & External Services

**Authentication & Identity:**
- Google OAuth - User login via Google account
  - Redirect URL: `VITE_APP_URL/auth/callback` (web) or `io.synark.hisabify://auth/callback` (mobile)
  - Implementation: `src/hooks/useAuth.tsx` with Supabase auth
  - PKCE flow enabled for mobile security

**Currency Exchange Rates:**
- OpenExchange Rates API - Fetch real-time currency conversion rates
  - Configuration: `OPENEXCHANGE_API_KEY` env var
  - Edge Function: `supabase/functions/get-exchange-rate/index.ts`
  - Caching: 6-hour TTL in `exchange_rates` table
  - Fallback: Returns rate 1 for same currency conversions

**Analytics & Error Tracking:**
- Firebase Analytics (Android native only)
  - Package: `@capacitor-firebase/analytics` 8.1.0
  - Lazy-loaded via dynamic import, zero cost on web
  - User ID tracking: UUID only (no PII)
  - Activation: `VITE_ENABLE_ANALYTICS` env var + native platform check
  - Events: sign_up, login, logout, add_transaction, create_budget, voice_input, scan_receipt, etc.
  - Implementation: `src/lib/analytics.ts`

**Error Tracking (Optional):**
- Sentry - Error and crash monitoring
  - Configuration: `VITE_SENTRY_DSN` env var
  - Optional integration - disabled if DSN not provided
  - Used for production error observability

**Firebase Crashlytics:**
- Crash Reporting (Android native only)
  - Package: `@capacitor-firebase/crashlytics` 8.1.0
  - Automatic exception recording
  - User ID tracking for crash grouping
  - Implementation: `src/lib/analytics.ts`

**Vercel Analytics:**
- Web Analytics - Page view and performance monitoring
  - Package: `@vercel/analytics` 2.0.1
  - Lightweight client-side tracking
  - No cookies or user identification

## Data Storage

**Primary Database:**
- Supabase PostgreSQL
  - Connection: Supabase client via `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
  - Authentication: Row-Level Security (RLS) policies enforce user isolation
  - Real-time: Postgres Change subscription via Supabase Realtime API
  - Key tables:
    - `users` - Profile, currency, subscription status, referral code
    - `transactions` - Expenses/income with multi-currency support
    - `categories` - Spending categories
    - `budgets` - Period-based budgets (weekly/monthly/yearly)
    - `cards` - Payment cards with balances
    - `savings_goals` - Savings targets with deadlines
    - `payment_reminders` - Bill reminders with recurrence
    - `exchange_rates` - Cached currency conversion rates (6-hour TTL)
    - `fcm_tokens` - Firebase Cloud Messaging device tokens (Android push)

**File Storage:**
- Supabase Storage - Receipt images and exports
  - Bucket: `receipts` - OCR-scanned receipt images
  - RLS policies enforce user-only access
  - Image optimization: `src/lib/imageProcessor.ts` compresses to <500KB

**Browser Storage:**
- localStorage - Persistent app state
  - Notification history: `app-notifications` key (max 50 notifications, 30-day retention)
  - Session tracking for budget warnings (once-per-day deduplication)
  - Weekly notification flags (health scores, tips)

**Caching:**
- In-memory cache (JavaScript) - Exchange rates with 6-hour TTL
  - Implementation: `src/hooks/useExchangeRate.tsx`
  - Deduplicates concurrent requests to same currency pair

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (PostgreSQL-backed)
  - Method: Email/password + Google OAuth
  - Session Management: PKCE flow for mobile, auto-refresh enabled
  - Persistence: localStorage (web) or Capacitor Preferences (mobile)
  - OAuth Redirect: Handles web and native custom schemes
  - Implementation: `src/hooks/useAuth.tsx`
  - Security:
    - Rate limiting on login attempts (`loginRateLimiter` in `src/lib/security.ts`)
    - Password strength validation
    - Email validation
    - PKCE flow for OAuth mobile security

**Post-Auth:**
- Profile context - User metadata after authentication
  - Hook: `src/hooks/useProfile.tsx`
  - Contains: Currency preference, avatar, subscription status, referral code

## Subscriptions & In-App Purchases

**Subscription Provider:**
- RevenueCat (iOS + Android in-app purchases)
  - Configuration: `VITE_REVENUECAT_API_KEY` env var
  - Packages: Monthly and yearly Pro plans
  - Webhook: `supabase/functions/revenuecat-webhook/index.ts`
    - Webhook secret: `REVENUECAT_WEBHOOK_AUTH_HEADER` env var
    - Activation events: INITIAL_PURCHASE, RENEWAL, UNCANCELLATION, NON_RENEWING_PURCHASE
    - Deactivation events: CANCELLATION, EXPIRATION, BILLING_ISSUE
    - Updates `users.subscription_type` and `users.subscription_status` on webhook
  - Client-side: `src/hooks/useRevenueCat.ts` handles in-app purchase flow
  - Feature gating: `src/components/PremiumGuard.tsx` wraps premium-only features

**Subscription Status:**
- Stored in `users.subscription_type` (free/pro) and `users.subscription_status` (active/inactive)
- Referral grants: `users.referral_granted_until` timestamp for time-limited Pro access
- Hook: `src/hooks/useSubscription.tsx` checks entitlements and initiates purchases

## Push Notifications & Messaging

**Push Notification Service:**
- Firebase Cloud Messaging (Android only)
  - Registration: `@capacitor/push-notifications` 8.0.2
  - Token Storage: `fcm_tokens` table (user_id, token, platform, updated_at)
  - Hook: `src/hooks/usePushNotifications.ts` handles registration and foreground messages
  - Notification Channel: `hisabify_reminders` (IMPORTANCE_HIGH, with vibration/sound)
  - Implementation:
    - Android permission check and request
    - Device token registration on first launch
    - Foreground notification handling (not in system tray, stored in localStorage)
    - Tap navigation support via deeplink in notification data

**Push Notification Delivery:**
- Edge Function: `supabase/functions/send-push-notification/index.ts`
  - Auth: Service-role key required (used internally only)
  - Input: user_id, title, body, optional data payload
  - Sends to all registered FCM tokens for a user
  - Response: `{ sent: N }` count
  - Called by `schedule-payment-reminders` function

**Scheduled Reminders:**
- Edge Function: `supabase/functions/schedule-payment-reminders/index.ts`
  - Trigger: Supabase pg_cron job (daily at 08:00 UTC)
  - Queries `payment_reminders` table for reminders due within `notify_before_days`
  - Sends via `send-push-notification` function
  - Respects `users.push_notifications_enabled` flag

**In-App Notification Manager:**
- LocalStorage-backed notification history
  - Manager: `src/lib/notificationManager.ts`
  - Types: budget_warning, budget_exceeded, goal_milestone, goal_completed, push_notification, health_weekly, weekly_tip
  - Features:
    - Retention: Last 50 notifications (trimmed on save)
    - Cleanup: Auto-delete notifications older than 30 days
    - Deduplication: Session storage keys prevent showing same alert twice per day
    - Weekly tips: 20+ financial tips (one per ISO week)
    - Health scores: Weekly financial health summaries
  - Custom Event: `hisabify:push-notification` dispatched when FCM received
  - Deeplink Resolution: Normalizes various deeplink formats (absolute paths, bare names, custom schemes)

## Webhooks & Callbacks

**Incoming (Backend → App):**
- RevenueCat Webhook: `supabase/functions/revenuecat-webhook/index.ts`
  - Endpoint: `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
  - Auth: Custom Authorization header (shared secret)
  - Payload: Purchase, renewal, cancellation events with user ID and product info
  - Effect: Updates subscription status in `users` table

**Outgoing (App → External Services):**
- None directly from client code
- All external integrations are server-side via Supabase Edge Functions

## Deployment & Hosting

**Web Hosting:**
- Vercel (SPA deployment)
  - Configuration: `vercel.json`
  - Rewrites: All routes → `/index.html` (React Router)
  - GitHub auto-deploy: **disabled** (`"github": { "enabled": false }`) — all deployments via GitHub Actions
  - Production deploy: `.github/workflows/production-deploy.yml` (push to `main`)
  - Staging deploy: `.github/workflows/staging-deploy.yml` (push to `develop`)
  - Staging URL: `https://hisabify-staging.vercel.app` (fixed alias, always latest `develop`)

**Mobile App Distribution:**
- iOS App Store - Native iOS app (built with Xcode from Capacitor)
  - App ID: `io.synark.hisabify`
  - Platform: iOS 13+

- Google Play Store - Native Android app (built with Android Studio from Capacitor)
  - App ID: `io.synark.hisabify`
  - Platform: Android 8+ (API level 26)

**Supabase Functions Deployment:**
- Deployed to Supabase project
  - Functions:
    - `get-exchange-rate` - Currency conversion API
    - `schedule-payment-reminders` - Daily payment reminder scheduler
    - `send-push-notification` - FCM message dispatcher
    - `revenuecat-webhook` - Subscription event processor

## Environment Configuration

**Client-Exposed Variables (.env):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anonymous key for client auth
- `VITE_SUPABASE_PROJECT_ID` - Project identifier
- `VITE_APP_URL` - Production app URL (for email links, OAuth redirects)
- `VITE_APP_NAME` - Application name for branding
- `VITE_SENTRY_DSN` - Optional error tracking (Sentry)
- `VITE_ENABLE_ANALYTICS` - Enable Firebase Analytics (default: true)
- `VITE_REVENUECAT_API_KEY` - RevenueCat SDK key for native purchases

**Server-Side Variables (Supabase Functions, not in client):**
- `SUPABASE_URL` - Service-role access
- `SUPABASE_SERVICE_ROLE_KEY` - Privileged database operations
- `OPENEXCHANGE_API_KEY` - OpenExchange Rates API key
- `REVENUECAT_WEBHOOK_AUTH_HEADER` - Webhook signature verification header

**Secrets Location:**
- `.env` file (git-ignored, never committed)
- Vercel Environment Variables dashboard (for production)
- Supabase project settings (for Edge Function secrets)

---

*Integration audit: 2025-03-19*
