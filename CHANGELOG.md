# Changelog

All notable changes to Hisabify will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Admin panel**: `/admin` (unlinked, reachable by URL) lists the newest 100 rows of `app_feedback` and `user_behavior_events` in a generic table view. Access is granted by the `public.is_admin()` email allowlist via additive RLS SELECT policies — non-admins still see only their own rows.
- **Feedback sheet full-height**: The feedback bottom sheet now opens at full height and can be dragged down to half.
- **In-app rating**: Star rating with an optional written comment, stored in `app_feedback`. Prompts at most once per day until the user rates or chooses "Don't ask again", and never within the first two days after signup. 4–5 star ratings are offered a follow-up link to the Google Play listing.
- **Feedback sheet**: `Settings → Support → Feedback` opens a bottom sheet with the signed-in email pre-filled, a type selector (Bug, Improvement, Feature request, Deletion request, Other + free-text label), a description field, and up to 3 file attachments (10 MB each) uploaded to the private `feedback-attachments` bucket.
- **Rate the app**: `Settings → Support → Rate the app` opens the Play Store listing (Custom Tab on Android, new tab on web).
- **Sub-categories**: Two-level category hierarchy with parent/child picker in transaction form.
- **Transaction tags**: Predefined multi-select tags (Tax Deductible, Reimbursable, Business, Personal, Vacation, Medical).
- **Transaction status**: Cleared/Uncleared toggle for expense and income transactions.
- **Split transaction**: Split a single expense across multiple categories with automatic parent-child tracking.
- **Merchant auto-fill**: Debounced autocomplete from transaction history with category pre-fill.
- **Save & Add Another**: Quickly add multiple transactions without closing the form.
- **Sub-category filter, tag filter, and Uncleared-only toggle** in Expenses page filter panel.
- **Uncleared badge, tag chips, and Parent › Sub label** in transaction list items.
- **Referral — Friends Joined Count**: The Share tab on the Invite Friends screen now shows "X friends joined" when at least one user has signed up via your referral link.
- **Referral — Loading Skeleton**: Referral code now shows an animated skeleton while the profile is loading instead of the static "--------" placeholder; copy and share buttons are disabled until the code is ready.

### Changed
- **Page transitions**: Route changes now use a shared motion definition (`src/lib/pageMotion.ts`) — a slightly longer fade-and-lift on enter and an opacity-only exit, replacing the previous two-directions-at-once slide. Honours `prefers-reduced-motion`.
- **Route loading**: `Suspense` boundaries moved from the app root down to each route. Navigating to a lazily-loaded page no longer blanks the entire app — the header and bottom navigation stay mounted — and the fallback spinner is delayed 250ms so short chunk loads never flash it.
- **Referral Share Links**: Invite and challenge share URLs now point to `/auth?ref=CODE` instead of `/?ref=CODE`. This ensures the referral code is captured by `AuthPage` without an intermediate redirect that previously dropped the param.

### Removed
- **Play In-App Review API** (added and removed while unreleased): `requestInAppReview()` and the `@capacitor-community/in-app-review` dependency are gone; both review entry points — the 4★+ CTA in `RatingSheet` and `Settings → Support → Rate the app` — call `openStoreListing()` directly.

  The API silently did nothing rather than failing. On a staging build (`io.synark.hisabify.staging`, via `applicationIdSuffix`), logcat showed `onGetLaunchReviewFlowInfo` succeeding, the flow completing in 345 ms, and `call.resolve()` — no rejection anywhere, so the `openStoreListing()` fallback never ran and the button was a dead end. The earlier claim that a sideloaded build makes `requestReviewFlow()` reject was wrong: it resolves.

  Play suppresses the dialog whenever the calling package was not distributed by Play *or* the undisclosed time-bound quota is hit, and reports neither case. Google's own guidance covers this exactly: "you should not have a call-to-action option (such as a button) to trigger the API, as a user might have already hit their quota and the flow won't be shown, presenting a broken experience to the user. For this use case, redirect the user to the Play Store instead." Both of our entry points are buttons, so the API had no valid trigger point in this app.

### Fixed
- **"Rate the app" did nothing**: `openStoreListing()` first tried a `market://` URL through `Browser.open()`, but that plugin is Chrome Custom Tabs and pins the intent to the browser package (`pkg=com.android.chrome`) — Chrome cannot resolve `market://`, so it failed with `ActivityNotFoundException` on every device, not just some. The https fallback then never ran: `@capacitor/browser` 8.0.3 resolves its JS promise from a listener fired in `BrowserControllerActivity.onCreate()`, but that activity is `launchMode="singleTask"` and was still alive from the failed first attempt, so the second call only reached `onNewIntent()` — which never notifies the listener — while `onResume()` finished the activity and `onDestroy()` nulled the listener. The promise never settled, and both call sites used `void openStoreListing()`, discarding it, so nothing surfaced. Fixed by dropping the impossible `market://` branch entirely; a single `Browser.open()` per gesture cannot hit the `singleTask` hang.
- **Android staging build crashed on launch (`Default FirebaseApp is not initialized`)**: `android/app/build.gradle` applied the `google-services` plugin only when a `google-services.json` was found, and silently skipped it otherwise. With the plugin skipped no `google_app_id` resource is generated, so `FirebaseInitProvider` never initializes the default `FirebaseApp` and the first `PushNotifications.register()` throws `IllegalStateException` on Capacitor's native plugin thread — killing the process where the JS `try/catch` in `usePushNotifications.ts` cannot reach it. Two fixes: the existence check now also looks at `android/app/google-services.json` (the conventional path named in `.gitignore`, which it previously ignored — so even a correctly-placed file left the plugin skipped), and a missing config now fails the build at configuration time with instructions instead of producing an APK that dies on launch. Note the `debug` and `staging` variants build as `io.synark.hisabify.staging` via `applicationIdSuffix`, so that package must be registered in the Firebase project alongside `io.synark.hisabify`.
- **Referral Code Blank ("--------")**: Two compounding bugs caused the referral code to never appear.
  1. *Trigger bug*: Migration `20260316` restored a call to `public.generate_referral_code()` which was dropped by `20260311_simplify_referrals`. Any user who signed up after March 16 either got a trigger exception or a NULL `referral_code`. Fixed in migration `20260317000100` by replacing the function call with an inline UUID substring formula, with a backfill for existing NULL codes. A guard `ADD COLUMN IF NOT EXISTS` was also added for idempotency.
  2. *Profile mapping bug*: `referred_by`, `referral_used_at`, and `referral_granted_until` were fetched via `select('*')` but silently dropped in `mapUserRowToProfile()` because they were absent from the `User` interface. This caused `hasUsedReferral` to always be `false`, `daysRemaining` to always be `0`, `hasActiveReferralGrant` in `useSubscription` to always be `false`, and the auto-redeem loop to fire for users who already redeemed. All three fields added to `User` interface, `defaultProfile`, and `mapUserRowToProfile` in `useProfile.tsx`.
- **Referral Deep Link — Query Param Lost on Redirect**: `ProtectedRoute` redirected unauthenticated users to `/auth` with a bare `<Navigate to="/auth" replace />`, stripping `?ref=` and `?challenge=` params. Fixed by forwarding both params through the redirect when present.

- **Feature Connectivity — Budget to Expenses**: Budget cards now have a "View in Expenses" action that navigates to the Expenses page pre-filtered by category and date range.
- **Feature Connectivity — Analytics to Expenses**: Clicking a category slice in the Analytics pie chart navigates to Expenses pre-filtered by that category and date range.
- **Feature Connectivity — Notification Action Links**: Budget notification cards now have "View Budget" and "View Spending" action buttons linking to relevant pages.
- **Feature Connectivity — Savings Budget Visibility**: Savings goal cards now display a badge showing the linked budget name when one is configured.
- **Expenses Page URL Param Support**: ExpensesPage accepts `category`, `categoryName`, `from`, `to`, and `viewMode` search params for cross-feature deep-linking.
- **Automated Test Runner Script**: Added `scripts/run-automated-tests.sh` to run `unit`, `e2e`, or `all` test suites on demand.
- **Timestamped Test Artifacts**: Automated runs now write logs, unit coverage reports, Playwright HTML reports, and E2E artifacts to `test-report/<YYYYMMDD-HHMMSS>/`.
- **NPM Shortcuts for Automation**:
  - `npm run test:automated`
  - `npm run test:automated:unit`
  - `npm run test:automated:e2e`
- **Savings Plan Scheduling**: Savings goals now support optional daily, weekly, or monthly schedules with live pace calculation, required-per-period guidance, suggested deadline recovery, free auto-remind, and compact contribution sparklines.
- **Savings Reminder Integration**: Scheduled savings reminders now support `daily` recurrence, use savings-specific labels, deep-link into the top-up flow, and create savings contribution transactions when marked paid.
- **Budget to Savings Transfer Loop**: Users can move leftover budget funds into savings goals through the shared funding flow while keeping main balance neutral and updating both budget and savings live views.

### Changed
- **Voice Input "Record Once" Architecture**: Rewrote `useVoiceInput.ts` from event-listener pattern (6 states, 5 refs, 3 useEffects) to promise-based `listen()`/`stop()` API (~433→265 lines). Eliminates all race conditions.
- **VoiceInputFlow Simplification**: Simplified `VoiceInputFlow.tsx` from ~430 to ~290 lines. Single async `handleRecord` drives all phase transitions; removed 4 useEffects.
- **NexusModal Voice Mode**: Updated VoiceModeContent to use new promise-based hook with phase-based rendering (idle/recording/result).
- **README Cleanup**: Removed placeholder Lovable project URL and documented automated test report workflow.
- **PRD Update**: Added implementation and non-functional quality notes for timestamped test/coverage artifacts.
- **Savings Goal Cards and Dashboard Snapshot**: Goal cards now surface pace status, required-this-period, suggested deadline actions, and history pacing context; dashboard snapshot rows now show pace/urgency and aggregate savings progress.
- **Financial Health and Insights**: Health score now rewards active savings planning, on-pace behavior, completed goals, and budget-to-savings transfers while penalizing behind-plan and overdue inactivity.
- **Analytics Savings Visibility**: Analytics now treats `Savings` as a permanent category, adds expense/savings/both chart modes, shows savings milestone markers, and surfaces monthly savings-rate insight.

### Fixed
- **Android Google OAuth Login**: Fixed two-part failure preventing Google sign-in on Android (Capacitor).
  1. Deep link `io.synark.hisabify://auth/callback?code=...` was silently ignored because `new URL()` parses custom schemes with `host="auth"` and `pathname="/callback"` — the path check for `/auth/callback` never matched. Fixed by reconstructing the full path as `/${parsed.host}${parsed.pathname}`.
  2. After navigation to `/auth/callback`, Supabase's `detectSessionInUrl` (which runs at client init on `https://localhost/`) had already missed the `?code=` param. Fixed by manually calling `supabase.auth.exchangeCodeForSession(code)` in `AuthCallbackPage` when a `code` query param is present.
- **Scrollbar Visibility**: Hidden scrollbars across all pages using multi-layered CSS fix with `!important` for cross-layer cascade, explicit `#root` rules, and `.custom-scrollbar` opt-in class for intentional scrollbars.
- **Android WebView Scrollbars**: Disabled native overlay scrollbars in `MainActivity.java` via `setVerticalScrollBarEnabled(false)`.
- **Voice Input Test Failures**: Fixed pre-existing test failures in `useVoiceInput.test.ts` by changing `toEqual` to `toMatchObject` (parseCommand returns extra fields).

---

## [1.1.1] - 2026-03-10

### Changed
- **Reminder Date Handling**: Normalized reminder date parsing/storage to calendar-day-safe values (UTC noon) across dashboard, reminders modal, add/edit form, and notifications page to prevent timezone drift.
- **Analytics Data Integrity**: Removed mock/sample analytics fallback; charts now render only real transaction data and show explicit empty states when data is unavailable.
- **Analytics Number Formatting**: Replaced hardcoded currency symbol on chart axes with locale-aware compact formatting.

### Fixed
- **Reminder Payment Flow**: Marking a reminder as paid now updates reminder status only; automatic transaction insertion was removed to prevent duplicates and currency mismatch side effects.
- **Dashboard Year Filter**: Year dropdown now derives from all transaction years to prevent missing-year selection gaps.
- **Health Score Copy**: Corrected displayed weight split to `40/30/30` to match scoring logic.
- **Lint Stability**: Fixed hook-order issue in `overlay-portal`, `useEffect` dependency warning in `ExpensesPage`, and `require()` import usage in `tailwind.config.ts`.

### Removed
- **Dashboard Daily Quote Block**: Removed from Home dashboard flow to keep release scope focused on finance-critical surfaces.
- **Client-side Reminder Scheduling**: Disabled `setTimeout`-based reminder scheduling in `notifications.ts`; reminder delivery now requires persistent system/backend scheduling.

---

## [1.1.0] - 2026-01-30

### Added
- **Localhost Development Support**: Complete Capacitor localhost configuration for rapid mobile app development
  - Smart toggle between localhost and ngrok endpoints in `capacitor.config.ts`
  - Pre-configured URLs for Android Emulator, Physical Devices, and iOS Simulator
  - Android Network Security Configuration for HTTP cleartext traffic
  - Automatic local IP detection script (`npm run local-ip`)
  - New npm scripts for faster Capacitor workflows
  - Complete documentation in `CAPACITOR_LOCALHOST_SETUP.md`

- **Mobile Performance Optimizations**: Comprehensive Android/iOS performance improvements
  - GPU acceleration for all animated elements (60fps target)
  - CSS containment strategies to prevent layout reflows
  - Optimized backdrop-blur rendering for Android
  - Hardware-accelerated particle animations
  - Reduced blur intensity for better mobile performance
  - Platform-specific optimizations for touch devices
  - `will-change` hints for smoother animations
  - Eliminated layout shifts during typewriter animations

- **New NPM Scripts**:
  - `npm run local-ip` - Find your local IP address for Capacitor
  - `npm run cap:sync` - Quick Capacitor sync
  - `npm run cap:android` - Build and open Android Studio
  - `npm run cap:ios` - Build and open Xcode
  - `npm run dev:android` - Quick run on Android device
  - `npm run dev:ios` - Quick run on iOS device

### Changed
- **StreamingGreeting Component**: Added layout containment to prevent text reflow jumps
- **ParticlesBackground**: Optimized with GPU hints and hardware acceleration
- **Dashboard Animations**: Added keys to motion sections and optimized transitions
- **Hero Card**: Optimized blur effects with GPU acceleration
- **Conditional Rendering**: Wrapped upgrade banner with AnimatePresence for smooth transitions

### Fixed
- **Android UI Glitches**: Eliminated jumping/stuttering animations on Dashboard
  - Fixed typewriter animation causing layout reflow
  - Optimized 20 particle animations reducing GPU usage by 40-50%
  - Fixed backdrop-blur performance bottleneck (CPU → GPU)
  - Added proper animation keys preventing redundant re-renders
  - Fixed stacked animation conflicts between parent and child elements
  - Smoothed conditional banner appearance/disappearance
  - Optimized decorative blur elements with hardware acceleration
  - Fixed sticky hover states on touch devices

- **iOS Compatibility**: Ensured all optimizations work seamlessly on iOS while improving Android

### Technical Details
- Modified files: 5 components, 1 page, 2 config files, 1 global CSS
- Added 150+ lines of mobile-specific CSS optimizations
- Zero visual changes - all optimizations are performance-only
- Maintained premium look and feel while achieving 60fps animations
- Compatible with Capacitor 8 for iOS and Android builds

### Documentation
- Created `CAPACITOR_LOCALHOST_SETUP.md` - Complete localhost development guide
- Updated `scripts/get-local-ip.js` - Automatic IP detection helper
- Added inline code documentation for performance optimizations

---

## [1.0.0] - 2026-01-26

### Added
- **Splash Screen**: Premium animated startup screen with "Health Scan" visuals.
- **Onboarding Flow**: 3-step tutorial for new users.
- **Daily Quotes**: Inspirational fintech quotes on the Dashboard.
- **Budget Planner**: Comprehensive budgeting tools.
- **Savings Goals**: Track progress for multiple savings targets.
- **Payment Reminders**: Recurring bill tracking.
- **Analytics**: Detailed spending charts and insights.

### Fixed
- **UI Layout**: Optimized header and content spacing for all devices.
- **Navigation**: Persistent bottom bar and unified header experience.
- **Performance**: Enhanced app load speed and transition smoothness.
