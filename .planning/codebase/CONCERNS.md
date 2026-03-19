# Codebase Concerns

**Analysis Date:** 2026-03-19

## Tech Debt

**Legacy currency fallback in payment reminders:**
- Issue: Some payment reminders store currency code as a string embedded in the `note` field (e.g., `"Auto-pay [USD]"`). The system tries to parse this fallback when the `currency` column is empty.
- Files: `src/lib/__tests__/reminderAmount.test.ts` (lines 94-106)
- Impact: Creates maintenance complexity and fragility. If note parsing breaks, reminders display with wrong currency symbols.
- Fix approach: Run a migration to extract all embedded currency codes into the `currency` column directly. Mark `currency` column as NOT NULL. Remove parsing logic entirely.

**Sentry error logging not implemented:**
- Issue: Logger service has Sentry integration scaffolding (commented out) but never initializes in production. Currently only console logging + Firebase Crashlytics.
- Files: `src/lib/logger.ts` (lines 27-40, 85-91)
- Impact: Production errors not centralized in Sentry; harder to track error trends.
- Fix approach: Uncomment Sentry initialization, install `@sentry/react`, configure DSN from env var. Run in production to centralize error tracking.

**Unhandled Promise rejections in background services:**
- Issue: `useExchangeRate.tsx` uses `Promise.all()` without global error handlers. If prefetch fails silently, no retry mechanism exists.
- Files: `src/hooks/useExchangeRate.tsx` (line 149)
- Impact: Exchange rates may not update, causing stale conversion rates. Users won't know rates are outdated.
- Fix approach: Add `try/catch` around `prefetchRates()` calls. Log failures to analytics. Add a visual "rates last updated X hours ago" indicator on dashboard.

**Raw console.log/console.error scattered throughout:**
- Issue: Many files use raw `console.error()` instead of logger service. Makes production debugging harder.
- Files: `src/hooks/useExchangeRate.tsx` (lines 64, 78, 96), `src/hooks/useCurrency.tsx` (lines 111, 128), others
- Impact: Inconsistent error reporting; errors not sent to Crashlytics/Sentry.
- Fix approach: Replace all `console.*()` calls with `logger.*()` service calls. Make logger a central error hub.

---

## Known Bugs

**Web Speech API onend() fires even when no speech detected:**
- Symptoms: Voice input returns empty string silently, `listen()` promise resolves without audio capture.
- Files: `src/hooks/useVoiceInput.ts` (lines 128-131)
- Trigger: User clicks "Record" but doesn't speak; onend fires immediately with no results.
- Workaround: Wrap listen() in timeout; if no transcript after 500ms, reject with "no speech detected" error.
- Fix approach: Track whether `onresult` actually fired. If onend fires without results, reject the promise instead of resolve('').

**Android/iOS "Deleted Service" warning on Firebase:**
- Symptoms: Build warnings about `HisabifyFirebaseMessagingService.java` being deleted but referenced in manifest.
- Files: `android/app/src/main/AndroidManifest.xml` (lines 68-71), deleted `HisabifyFirebaseMessagingService.java`
- Trigger: Capacitor Push Notifications plugin now handles FCM directly; custom service no longer needed.
- Workaround: None; still builds successfully but emits warnings.
- Fix approach: Remove the deleted service file from git history OR recreate stub to match manifest.

---

## Security Considerations

**usesCleartextTraffic enabled in production:**
- Risk: Android allows unencrypted HTTP traffic in production (localhost development workaround).
- Files: `android/app/src/main/AndroidManifest.xml` (line 38)
- Current mitigation: `network_security_config.xml` restricts cleartext to specific domains.
- Recommendations:
  - Verify `network_security_config.xml` only allows localhost/127.0.0.1.
  - Set `usesCleartextTraffic="false"` for production builds.
  - Use build variants to conditionally enable cleartext only in debug builds.

**Deeplink validation insufficient:**
- Risk: Push notification deeplinks are resolved by simple regex stripping. Malformed URIs could cause unexpected navigation.
- Files: `src/lib/notificationManager.ts` (lines 63-69), `src/hooks/usePushNotifications.ts` (lines 118-119)
- Current mitigation: `resolveDeepLink()` checks for valid path prefix.
- Recommendations:
  - Use URL constructor validation instead of regex.
  - Whitelist allowed deeplink paths (e.g., `/notifications`, `/budget`, `/profile`) in `usePushNotifications.ts`.
  - Log suspicious deeplinks for monitoring.

**localStorage/sessionStorage not cleared on logout:**
- Risk: Notifications, currency preference, and session tokens remain in storage after logout.
- Files: `src/lib/notificationManager.ts`, `src/hooks/useCurrency.tsx`, `src/hooks/useAuth.tsx` (logout handler)
- Current mitigation: Auth service handles session tokens; but app state (currency, notifications) persists.
- Recommendations:
  - Clear app-specific localStorage keys (app-notifications, currency, etc.) on logout.
  - Add explicit `clearUserData()` function called in logout handler.
  - Never store auth tokens in localStorage; use secure, httpOnly cookies (via Supabase auth).

**FCM token stored with insufficient validation:**
- Risk: FCM tokens could be spoofed if registration flow doesn't validate token format.
- Files: `src/hooks/usePushNotifications.ts` (lines 62-88)
- Current mitigation: Supabase stores token; relies on platform-level FCM security.
- Recommendations:
  - Add server-side validation of FCM token format before storing.
  - Rotate tokens periodically (refresh yearly).
  - Log token registration attempts for fraud detection.

---

## Performance Bottlenecks

**In-memory exchange rate cache never expires:**
- Problem: `rateCache` in `useExchangeRate.tsx` checks 6-hour staleness, but memory isn't freed after expiry.
- Files: `src/hooks/useExchangeRate.tsx` (lines 17, 40-46)
- Cause: Cache entries are never deleted, only checked for staleness. Over time, memory grows unbounded.
- Improvement path:
  1. Add a cleanup function that deletes stale entries every hour.
  2. Implement LRU eviction (max 100 cached pairs).
  3. Export `clearExchangeRateCache()` for logout/test cleanup.

**NotificationManager localStorage parsing on every render:**
- Problem: `getNotifications()` parses entire JSON array from localStorage every time.
- Files: `src/lib/notificationManager.ts` (lines 21-31)
- Cause: No memoization; components using notifications re-query storage on every render.
- Improvement path:
  1. Implement in-memory cache with invalidation on updates.
  2. Or move to React Context to cache parsed notifications.
  3. Add `useNotifications()` hook that memoizes results.

**Promise.all() for exchange rate prefetch blocks on slowest API:**
- Problem: `prefetchRates()` waits for all rates to load before returning.
- Files: `src/hooks/useExchangeRate.tsx` (line 149)
- Cause: Used during initialization; if 1 of 9 rates is slow, app waits on that pair.
- Improvement path:
  1. Use `Promise.allSettled()` instead of `Promise.all()`.
  2. Only wait for critical pairs (user's currency + USD).
  3. Prefetch remaining pairs in background without blocking.

**Geolocation + IP-based currency detection runs on every cold start:**
- Problem: `detectLocationCurrency()` in `useCurrency.tsx` makes 2 network calls (geolocation + IP API).
- Files: `src/hooks/useCurrency.tsx` (lines 72-131)
- Cause: No memoization; if localStorage is cleared, detection runs again on every session.
- Improvement path:
  1. Store detected country code in localStorage alongside currency.
  2. Run detection only if stored currency is 'USD' (default).
  3. Cache IP detection result with 1-week TTL to avoid repeated calls.

---

## Fragile Areas

**Voice command parsing with 8+ regex patterns:**
- Files: `src/hooks/useVoiceInput.ts` (lines 234-312)
- Why fragile: Each pattern handles different word order (spent/paid X at/for Y, X dollars for Y, bought Y for X, etc.). Adding new patterns risks regex conflicts.
- Safe modification:
  1. Test new patterns against 50+ real voice transcripts before deploy.
  2. Add confidence scores to help users verify before saving.
  3. Consider ML-based parsing in Phase 8 (TRD.md notes this).
- Test coverage: Limited to pattern-level tests; no integration tests with real speech-to-text output.

**Payment reminder notification scheduling:**
- Files: `supabase/functions/schedule-payment-reminders/index.ts`
- Why fragile: Cron job runs once daily at 08:00 UTC. If it fails (network, Deno timeout), no retry. Reminders are silently skipped.
- Safe modification:
  1. Add error logging to Supabase logs.
  2. Implement exponential backoff for `send-push-notification` calls.
  3. Add a dashboard widget to show "last successful run" time.
- Test coverage: E2E test in `e2e/reminders.spec.ts` but doesn't test cron failure scenarios.

**Real-time subscription debouncing in useBudgets:**
- Files: `src/hooks/useBudgets.tsx` (lines 82-118, 191, 324)
- Why fragile: Uses `isFetchingRef` + 500ms debounce. If user rapidly creates transactions, some updates may be skipped.
- Safe modification:
  1. Use TanStack Query's `useQuery` with automatic deduplication (already imported).
  2. Replace ref-based debouncing with Query's built-in staleTime management.
  3. Test with rapid multi-transaction creation.
- Test coverage: Unit tests for `fetchBudgets()` exist, but no integration test for subscription race conditions.

**Push notification deeplink navigation:**
- Files: `src/hooks/usePushNotifications.ts` (lines 114-123)
- Why fragile: Directly navigates on notification tap without checking if route exists. Non-existent routes silently fail.
- Safe modification:
  1. Validate deeplink against known routes before navigate.
  2. Fallback to `/notifications` page if route invalid.
  3. Log invalid deeplinks for monitoring.
- Test coverage: No tests for deeplink navigation; manual testing only.

---

## Scaling Limits

**FCM token storage without cleanup:**
- Current capacity: Table can store unlimited tokens, but no TTL or cleanup.
- Limit: Eventually table bloats with stale tokens from uninstalled apps.
- Scaling path:
  1. Add `expires_at` column with 1-year TTL.
  2. Add nightly cron job to delete expired tokens.
  3. Add logic to refresh token yearly on app launch.

**Notification localStorage limited to 50 items:**
- Current capacity: `MAX_NOTIFICATIONS = 50` (hard-coded).
- Limit: Older notifications purged when >50 stored.
- Scaling path:
  1. Increase limit to 200-500 once Supabase notification history table is added.
  2. Move notifications to backend storage for persistence.
  3. Implement pagination on NotificationsPage.

**Exchange rate cache memory unbounded:**
- Current capacity: No limit on cached currency pairs.
- Limit: Over years, cache grows with each unique pair queried.
- Scaling path:
  1. Implement LRU eviction (max 100 pairs, ~50KB memory).
  2. Use IndexedDB for larger cache (if 6-hour stale time insufficient).
  3. Consider server-side caching (Supabase) with shared pool.

---

## Dependencies at Risk

**@capacitor-community/speech-recognition (unmaintained):**
- Risk: Package has minimal maintenance; Web Speech API is preferred but has browser/platform variance.
- Impact: If plugin breaks on new Android/iOS, no fallback on native side.
- Migration plan:
  1. Deprecate native plugin; standardize on Web Speech API only.
  2. Remove Capacitor Speech Recognition plugin dependency.
  3. Implement browser detection with graceful degradation (disable voice on unsupported browsers).

**open.er-api.com (free tier, no SLA):**
- Risk: Exchange rate API has 1500 requests/month limit and no uptime guarantee.
- Impact: If API rate-limited or down, currency conversion fails silently.
- Migration plan:
  1. Add fallback to cached rates if API unavailable.
  2. Implement exponential backoff + retry logic.
  3. Plan to migrate to paid exchange rate service (Fixer.io, Open Exchange Rates) before scaling.

**Firebase Crashlytics (proprietary, Google-locked):**
- Risk: Vendor lock-in; data export difficult; pricing unclear for large-scale apps.
- Impact: Hard to migrate if Firebase pricing becomes expensive.
- Migration plan:
  1. Add Sentry as primary error tracker (open standard).
  2. Keep Crashlytics as secondary for app crashes.
  3. Standardize on Sentry for all production analytics.

---

## Missing Critical Features

**No offline support:**
- Problem: App requires internet for every operation. No service worker, no local database.
- Blocks: Users can't view transactions/budgets offline.
- Fix approach:
  1. Add Capacitor SQLite for local database.
  2. Implement offline-first sync using TanStack Query + background sync.
  3. Queue transactions for upload when online.
  4. Priority: Medium (Phase 5+ in roadmap).

**No push notification history in backend:**
- Problem: Notifications stored only in localStorage; lost when user clears cache or switches device.
- Blocks: No notification history across devices.
- Fix approach:
  1. Add `notification_history` table in Supabase.
  2. Migrate localStorage notifications on first app launch.
  3. Sync new notifications to backend via Edge Function.
  4. Priority: Low (nice-to-have for premium).

**No notification preferences per type:**
- Problem: All notifications toggle on/off together. Can't disable payment reminders but keep health score updates.
- Blocks: Users can't customize notification delivery.
- Fix approach:
  1. Add `notification_settings` table: `(user_id, type, enabled)`.
  2. Update push notification sender to check per-type preference.
  3. Add settings page UI in `/settings/notifications`.
  4. Priority: Medium (Phase 4 in roadmap).

---

## Test Coverage Gaps

**Push notification integration:**
- What's not tested: FCM token registration, permission flows, deeplink navigation, foreground vs. background handling.
- Files: `src/hooks/usePushNotifications.ts`, `src/hooks/usePermissions.ts`
- Risk: Notifications could fail silently on device; only discovered in production.
- Priority: High
- Approach: Add E2E tests with Capacitor Tester plugin to simulate FCM messages.

**Voice input parsing accuracy:**
- What's not tested: Real speech-to-text output; only unit tests with mock text.
- Files: `src/hooks/useVoiceInput.ts` (parseCommand)
- Risk: Parsing breaks with accent variations, background noise, or regional phrases.
- Priority: High (Phase 2 blocker)
- Approach: Collect 100+ real voice samples, test against current regex patterns, adjust patterns before Phase 2 release.

**Exchange rate API failure scenarios:**
- What's not tested: API timeout, rate-limit (429), currency not found, network offline.
- Files: `src/hooks/useExchangeRate.tsx`
- Risk: Silent failures; users see NaN or 0 amounts.
- Priority: Medium
- Approach: Add error boundary tests; mock fetch failures; verify fallback behavior.

**Budget rollover at period boundary:**
- What's not tested: Budget rollover when spending period resets (weekly Mon/Fri, monthly 1st, yearly Jan 1).
- Files: `src/hooks/useBudgets.tsx`
- Risk: Spending from old period counted in new period; alerts fire incorrectly.
- Priority: High
- Approach: Add time-travel tests using date-fns/jest.useFakeTimers(); test all period types.

**Currency conversion with extreme values:**
- What's not tested: Very large amounts (>999999999), tiny decimals (<0.01), zero/negative conversion rates.
- Files: `src/hooks/useExchangeRate.tsx`, `src/hooks/useConvertedAmount.tsx`
- Risk: NaN, Infinity, or negative amounts in UI.
- Priority: Medium
- Approach: Add property-based tests (fast-check) with randomized amounts/rates.

**Supabase Row-Level Security (RLS) on all tables:**
- What's not tested: Whether RLS policies actually prevent cross-user data leaks.
- Files: `supabase/migrations/` (RLS policies not shown)
- Risk: SQL injection or privilege escalation could expose other users' transactions.
- Priority: Critical
- Approach: Add integration tests that verify non-authenticated and wrong-user queries return 0 rows.

---

*Concerns audit: 2026-03-19*
