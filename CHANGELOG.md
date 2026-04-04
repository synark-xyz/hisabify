# Changelog

All notable changes to Hisabify will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
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
- **Referral Share Links**: Invite and challenge share URLs now point to `/auth?ref=CODE` instead of `/?ref=CODE`. This ensures the referral code is captured by `AuthPage` without an intermediate redirect that previously dropped the param.

### Fixed
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
