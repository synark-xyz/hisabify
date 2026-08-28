# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Senior Developer Protocol

All work performed by the AI agent must adhere to the following safety and quality rules:
1. **No Blind Edits:** Analyze all dependencies using `grep` before modifying code.
2. **Plan First:** Propose a detailed `implementation_plan.md` for every task.
3. **Wait for Approval:** Never modify source code until the user provides explicit "Go" or "Approved".
4. **Zero Placeholders:** Deliver complete, typed, and production-ready code.
5. **Ask for Clarification:** If any business logic or requirement is unclear, STOP and ask the user.
6. **Detailed Rules:** Refer to `.agent/rules.md` for the full instruction set.
7. **Update Documentation:** Whenever you change code, logic, features, or fix bugs, update the relevant documentation files (`docs/`, `README.md`, `PRD.md`, `UPDATE.md`, `CHANGELOG.md`) to reflect those changes. Keep docs in sync with the codebase at all times.
8. **Use LSP for Codebase Search:** When searching for symbols, definitions, references, or type information, prefer LSP tools (e.g., `mcp__ide__getDiagnostics`, go-to-definition, find-references) over plain `grep`. LSP understands TypeScript semantics — use it for symbol lookups, type-aware navigation, and finding all usages of a function or type. Fall back to `grep`/`Glob` only when LSP tools are unavailable or when searching non-code content (comments, strings, config files). If no relevant LSP tool is installed, suggest installing one (e.g., the `@modelcontextprotocol/server-typescript` MCP server).

## Project Overview

Hisabify is a mobile-first personal finance web application for tracking cards, expenses, budgets, and recurring payments. Built as a SPA with React + TypeScript + Vite, backed by Supabase (PostgreSQL + Auth + Edge Functions).

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite
- Styling: Tailwind CSS + shadcn UI components
- Backend: Supabase (PostgreSQL + Auth + Edge Functions)
- State: React Context + Custom Hooks + TanStack React Query
- Testing: Vitest + Testing Library
- Mobile: Capacitor 8 (iOS + Android)

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (localhost:8080)
npm run dev

# Managed dev server (mobile-friendly)
npm run dev:managed

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Run linter
npm run lint

# Run tests (Vitest, watch mode)
npm test

# Single-run unit tests / with coverage (what CI runs)
npm run test:unit
npm run test:coverage

# One file, or one test by name
npx vitest run src/lib/__tests__/ads.test.ts
npx vitest run -t "shouldShowBanner"

# E2E (Playwright) — needs .env.test + a dev server on :8080
npm run test:e2e
npm run test:e2e:ui
npx playwright test e2e/budgets.spec.ts -g "creates a budget"

# Preview production build
npm run preview

# Mobile Development (Capacitor 8)
npm run local-ip        # Find your local IP for device testing
npm run cap:sync        # Sync web app with native projects
npm run cap:android     # Build and open Android Studio
npm run cap:ios         # Build and open Xcode
npm run dev:android     # Quick run on Android (no rebuild)
npm run dev:ios         # Quick run on iOS (no rebuild)
npm run cap:run:android # Build, sync, and run on Android
npm run cap:run:ios     # Build, sync, and run on iOS

# Staging (loads the web app from a remote URL — see APP_ENV below)
npm run dev:staging          # Local staging server on :8181
npm run dev:staging:ngrok    # …exposed via ngrok
npm run cap:android:staging  # Build + sync with APP_ENV=staging, open Android Studio
npm run cap:android:release  # Build + sync with APP_ENV=production
```

## Project Structure

```
src/
├─ pages/              # Route-level screens (Dashboard, BudgetPage, profile/*, settings/*)
├─ components/         # Reusable UI and feature components
│  └─ ui/             # shadcn/Radix primitives (Button, Dialog, etc.)
├─ hooks/              # Domain/data hooks (useTransactions, useBudgets, useAuth, etc.)
├─ lib/                # Shared utilities (security, logging, export/report helpers)
├─ features/           # Scoped feature modules (gamification/, referrals/)
├─ integrations/
│  └─ supabase/       # Supabase client and generated types
├─ types/              # Core TypeScript type definitions
└─ test/               # Test setup (setup.ts)

supabase/migrations/   # Database schema changes
android/, ios/         # Native Capacitor projects
public/, assets/       # Static assets
```

**Import Pattern:**
- Use `@/` alias for imports (configured in `tsconfig.json`)
- Example: `import { useAuth } from '@/hooks/useAuth'`
- Avoid deep relative paths like `../../../hooks/useAuth`

## Architecture Overview

### Context Provider Hierarchy

The app wraps routes with nested providers (order matters):

```
ErrorBoundary
  └─ QueryClientProvider (React Query)
      └─ ThemeProvider
          └─ TooltipProvider
              └─ BrowserRouter
                  └─ AuthProvider
                      └─ ProfileProvider
                          └─ CurrencyProvider
                              └─ Routes
```

**Key Providers:**
- `AuthProvider` (`src/hooks/useAuth.tsx`) - Supabase auth state, login/signup/logout
- `ProfileProvider` (`src/hooks/useProfile.tsx`) - User profile, avatar, subscription
- `CurrencyProvider` (`src/hooks/useCurrency.tsx`) - Multi-currency with geolocation detection
- `ThemeProvider` (`src/hooks/useTheme.tsx`) - Dark/light/cyberpunk theme

### Routing Structure

React Router v6 with protected routes:

```
/ (Dashboard - protected)
├─ /expenses
├─ /analytics
├─ /budget
├─ /savings
├─ /reports
├─ /profile
│  ├─ /profile/personal
│  ├─ /profile/data
│  └─ /profile/invite
├─ /settings
│  ├─ /settings/preferences
│  └─ /settings/notifications
├─ /notifications
└─ /auth (public)
   ├─ /onboarding
   ├─ /reset-password
   └─ /install
```

- `ProtectedRoute` - Redirects to `/auth` if not authenticated
- `AuthRoute` - Redirects authenticated users to dashboard, checks onboarding status
- `Layout` - Wraps protected routes with header + bottom navigation

### State Management Pattern

Custom hooks in `src/hooks/` handle domain logic and data fetching:

**Core Domain Hooks:**
- `useTransactions()` - Fetch, filter, sort transactions with real-time updates
- `useBudgets()` - Budget CRUD with spending calculations and currency conversion
- `useSavingsGoals()` - Manage savings goals
- `usePaymentReminders()` - Fetch payment reminders
- `useExchangeRate()` - Currency conversion with in-memory caching

**Common Hook Pattern:**
```typescript
export function useDomainData() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Optimistic update pattern
  const createItem = async (input) => {
    // 1. Update state immediately
    setData(current => [newItem, ...current]);

    // 2. Persist to backend
    try {
      await supabase.from('table').insert(...);
    } catch {
      // 3. Revert on error
      setData(current => current.filter(i => i.id !== tempId));
    }
  };

  // Real-time subscription with debouncing
  useEffect(() => {
    const channel = supabase
      .channel('table-changes')
      .on('postgres_changes', { event: '*', table: 'table' }, debouncedFetch)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  return { data, loading, createItem, updateItem, deleteItem };
}
```

### Supabase Integration

**Client:** `src/integrations/supabase/client.ts` - Singleton Supabase client
**Types:** `src/integrations/supabase/types.ts` - Auto-generated from schema

**Key Tables:**
- `users` - Profile, currency preference, subscription, referral code
- `cards` - Payment cards with balance
- `transactions` - Expenses/income with multi-currency support
- `categories` - Spending categories
- `budgets` - Period-based budgets (weekly/monthly/yearly)
- `payment_reminders` - Bill reminders with recurrence
- `savings_goals` - Savings targets with deadlines
- `exchange_rates` - Currency conversion rates cache

**Query Pattern:**
```typescript
const { data } = await supabase
  .from('transactions')
  .select('*, category:categories(*)')
  .eq('user_id', user.id)
  .order('date', { ascending: false });
```

**Real-time Pattern:**
```typescript
const channel = supabase
  .channel('changes')
  .on('postgres_changes',
    { event: '*', table: 'table', filter: `user_id=eq.${user.id}` },
    handleChange
  )
  .subscribe();
```

### Component Organization

```
src/components/
├─ ui/                     # shadcn/radix-ui primitives (40+ components)
├─ dashboard/              # Dashboard charts and summaries
├─ analytics/              # Analytics visualizations
├─ savings/                # Savings goal components
├─ reports/                # Report generation
├─ Layout.tsx              # Main layout with header + bottom nav
├─ AddTransactionModal.tsx # Transaction creation
├─ AddBudgetModal.tsx      # Budget creation
├─ ReceiptScannerModal.tsx # OCR receipt scan (Gemini Vision)
├─ PremiumGuard.tsx        # Feature gating wrapper
└─ ...
```

**When building UI:**
1. Use shadcn components from `src/components/ui/`
2. Import domain hooks for data
3. Handle loading/error states with toast notifications
4. Use optimistic updates for better UX

## Key Architectural Patterns

### 1. Optimistic UI Updates

Used throughout for perceived performance:
```typescript
// Update UI immediately
setData(current => [newItem, ...current]);

// Persist in background
try {
  await supabase.from('table').insert(...);
} catch {
  // Revert on error
  setData(current => current.filter(i => i.id !== tempId));
}
```

### 2. Currency Conversion Strategy

- Store original currency with each transaction
- Exchange rates cached in memory (6-hour TTL)
- All UI displays use user's selected currency
- Conversion happens client-side after fetch
- Deduplicate pending requests to same currency pair

### 3. Real-time with Debouncing

Prevent excessive re-fetches on rapid changes:
```typescript
const debouncedFetch = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchData, 1000);
};
```

### 4. Duplicate Fetch Prevention

Use refs to avoid race conditions:
```typescript
const isFetchingRef = useRef(false);
const lastFetchRef = useRef<number>(0);

if (isFetchingRef.current || (now - lastFetchRef.current) < 500) {
  return; // Skip
}
```

### 5. Security Practices

- Client-side: Input sanitization, rate limiting, validation (`src/lib/security.ts`)
- Server-side: Row-Level Security (RLS) policies on all tables
- Auth user ID matching enforced
- No secrets in client code

### 6. Error Handling

- `ErrorBoundary` component wraps entire app
- `AppError` interface for consistent error structure
- `Logger` service in `src/lib/logger.ts` (with Sentry support)
- Toast notifications for user-facing errors

### 7. Runtime Permission Handling (Mobile)

Use `usePermissions()` hook for native app permission checks:
```typescript
const { ensurePermission, isNative } = usePermissions();

// Check and request permission before feature use
const hasPermission = await ensurePermission('microphone');
if (!hasPermission) {
  toast({ title: 'Microphone access denied' });
  return;
}
// Proceed with feature
```

**Supported Permissions:**
- `'camera'` - Native camera access
- `'photos'` - Photo library access
- `'microphone'` - Audio recording
- `'location'` - Geolocation

**Best Practices:**
- Request permissions contextually (when user taps feature button)
- Handle denials gracefully with clear error messages
- Provide link to app settings for permanently denied permissions
- Works across web, iOS, and Android with single API

## Feature-Specific Guidance

### Multi-Currency Support

- User selects base currency in preferences
- Transactions store both original and converted amounts
- Exchange rates fetched from Supabase Edge Function
- Conversion happens at display time, not storage time
- Hook: `useCurrency()` and `useExchangeRate()`

### Budget System

- Budgets have periods (weekly/monthly/yearly)
- Can be category-specific or total
- Spending calculated by summing transactions in period
- Status: safe (<80%), warning (80-99%), exceeded (≥100%)
- Real-time updates on transaction changes
- Currency conversion applied to spending calculations

### Unified FAB with Smart Input Methods

- **Three Input Methods:** Voice Memo, Receipt Scanner, Manual Entry
- **Single Entry Point:** Unified FAB in bottom navigation center
- **Component:** `InputMethodSheet.tsx` - Bottom sheet with 3 action cards
- **Documentation:** `docs/` is gitignored — treat `InputMethodSheet.tsx` as the source of truth

### Receipt Upload with OCR & Image Optimization

- **Component:** `ReceiptScannerModal.tsx` - Receipt capture with OCR
- **Technology:** Gemini Vision (`src/lib/geminiVision.ts`) with `src/lib/receiptParser.ts` for extraction
- **Image Processing:** `src/lib/imageProcessor.ts`
- **Optimization:** Compress to <500KB while preserving text readability
- **Storage:** Supabase Storage with RLS policies (bucket: `receipts`)
- **Features:** Extracts merchant, amount, date; pre-fills transaction form
- **A placeholder key is truthy.** `if (!apiKey)` does not catch `your_gemini_api_key` — it sails
  through and fails as an opaque 400 from Google. `geminiVision.ts` tests the key against a
  placeholder pattern and throws `GEMINI_KEY_MISSING`, which the modal reports as "Receipt
  Scanning Unavailable" rather than "Scan Failed — try again" (advice for something retrying
  cannot fix).
- **`VITE_` vars are inlined at build time**, so an installed APK carries whatever was in `.env`
  when it was built. Changing `.env` cannot fix a shipped binary — only `npm run build && npx cap
  sync` and a reinstall can. It also means the key is extractable from any shipped build; restrict
  it to the Generative Language API and cap its quota. The structurally correct fix is moving the
  call behind the `parse-transaction` edge function, which already holds a server-side key.
- **Store the compressed image, not the raw file.** `receipt_url` briefly held raw base64 data URLs
  (one production row is 2.5 MB) that `select *` refetched on every transaction list load.
- **Mobile Permissions:**
  - Android: `CAMERA`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE`
  - iOS: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`
  - Runtime permission flow: `ensurePermission('camera')` and `ensurePermission('photos')`
- **Documentation:** `docs/` is gitignored — treat `InputMethodSheet.tsx` as the source of truth

### Voice Input for Transactions

- **Component:** `VoiceInputFlow.tsx` - Simplified voice recording interface with 3 phases (idle/recording/result)
- **Technology:** Capacitor Speech Recognition (native) + Web Speech API (browser fallback)
- **Hook:** `useVoiceInput.ts` - Promise-based "Record Once" architecture
- **Hook:** `usePermissions.ts` - Runtime permission handling for native apps
- **Architecture:** Promise-based blocking calls — no event listeners, no partial results, no race conditions
  - `listen(): Promise<string>` — starts recognition, blocks until speech ends, returns final text
  - `stop(): Promise<void>` — stops early; recognition finalizes and `listen()` promise resolves
  - `parseCommand(text)` — regex-based merchant/amount extraction (unchanged)
  - Native path: `SpeechRecognition.start({ partialResults: false })` returns blocking promise
  - Web path: `new SpeechRecognition()` with `continuous: false, interimResults: false` wrapped in Promise
- **Features:**
  - Automatic merchant/amount parsing (~70-80% accuracy)
  - Pulsing animation during recording
  - Android auto-silence-detection (~2-3s)
  - Permission checking and error handling
  - "Use This" button to pre-fill transaction form
  - Tips for better voice input
  - Native microphone permission requests (iOS/Android)
- **Limitations:**
  - Requires browser support (Chrome, Safari, Edge - full; Firefox - partial)
  - English only (Phase 2)
  - Regex-based parsing (AI upgrade in Phase 8)
- **Mobile Permissions:**
  - Android: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`
  - iOS: `NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription`
  - Runtime permission flow: `ensurePermission('microphone')` before recording

### In-App Rating & Feedback

Both write to a single `app_feedback` table, discriminated by a `kind` column (`'rating'` | `'feedback'`).

- **Rating:** `RatingSheet.tsx` (stars + optional comment). Cadence lives in `useAppRating.ts`; the decision itself is a pure function in `src/lib/ratingPrompt.ts` (`shouldPromptRating`) so it is unit-testable. Prompts at most once per 24h, skips the first 2 days after a user is first seen, and stops permanently once the user rates or picks "Don't ask again". Local state is Capacitor `Preferences`; a once-per-session query of `app_feedback` catches users who rated on another device. Mounted in `Layout.tsx`, so it only fires on the main app pages.
- **Feedback:** `FeedbackSheet.tsx`, opened from `Settings → Support → Feedback`. Opens full-height (`snapPoints={[1, 0.5]}`) and drags down to half. Email is read-only from the session. Attachments go to the private `feedback-attachments` bucket as `{user_id}/{timestamp}-{name}`; the table stores storage *paths*, not public URLs — resolve them with a signed URL server-side.
- **Review prompt:** `openStoreListing()` in `src/lib/appStore.ts` drives both entry points — the 4★+ CTA in `RatingSheet` and `Settings → Support → Rate the app`.

  **Do not reintroduce the [Play In-App Review API](https://developer.android.com/guide/playcore/in-app-review) here.** Google's guidance is explicit: "you should not have a call-to-action option (such as a button) to trigger the API, as a user might have already hit their quota and the flow won't be shown, presenting a broken experience to the user. For this use case, redirect the user to the Play Store instead." Both of our entry points are buttons.

  It was tried and removed. The failure mode is silence, not an error: Play suppresses the dialog when the calling package was not distributed by Play (any `.staging` build — see `applicationIdSuffix` in `android/app/build.gradle`) or when the undisclosed time-bound quota is hit, and reports neither. `requestReviewFlow()` **resolves** in both cases, so a `catch`-based fallback never fires and the button does nothing at all. If you ever add an automatic, non-button trigger, that is the only context where the API is appropriate — and even then never gate UI on the dialog having shown, and never retry.

### Admin Panel

`src/pages/AdminPage.tsx` at `/admin` — a read-only table viewer for triaging `app_feedback` and `user_behavior_events` (newest 100 rows, columns derived from the response). Deliberately unlinked from any nav; it is reachable only by typing the URL.

Access is an **email allowlist**, not a role column: `public.is_admin()` (`supabase/migrations/20260729000100_add_admin_read_access.sql`) compares `auth.jwt() ->> 'email'` against a hardcoded list, and additive `FOR SELECT ... USING (public.is_admin())` policies OR with the existing own-rows policies. Adding an admin means editing both the SQL function and `ADMIN_EMAILS` in `AdminPage.tsx` — the constant only decides whether to render, RLS is what actually enforces. Never gate this with the service-role key; it must not reach client code.

  Note `openStoreListing()` must not use a `market://` URL — `Browser.open()` is Chrome Custom Tabs, which pins the intent to the browser package, and Chrome cannot resolve `market://`. The https listing is app-linked and hands off to the Play Store app anyway. The URL always names the production package; staging builds have no listing of their own.

Note: attachment upload failure never blocks a submission — the text is sent regardless.

### Legal Documents & Data Privacy

Legal copy lives in `src/lib/legalContent.tsx` (`TermsContent`, `PrivacyContent`, `LEGAL_LAST_UPDATED`, `LEGAL_CONTACT_EMAIL`) and `src/components/SubscriptionTermsContent.tsx`. Always reference `LEGAL_CONTACT_EMAIL` — never hardcode a support address.

Two routes, both public (outside `ProtectedRoute`, so store listings and signed-out readers can reach them): **Terms & Conditions at `/terms`** — Terms of Service *and* Subscription & Billing on one page, under group headings, because each document restarts its numbering at 1 — and **Privacy Policy at `/privacy`**. `/subscription-terms` is a redirect to `/terms`, kept because a store listing may still point at it.

Privacy stays its own route on purpose: Play Console Data Safety and App Store Connect want a URL whose page *is* the privacy policy, so don't fold it into `/terms`.

Both routes render through `LegalDocPage` (`src/components/LegalDocPage.tsx`), which owns the page chrome and the "Last updated" line. **Neither `TermsContent` nor `PrivacyContent` renders that line** — whoever renders a document owns it, so a page showing two documents prints it once. `LegalModal` renders its own copy for the same reason.

`LegalDocPage` deliberately has **no `ScrollArea`**; the page scrolls natively. The previous `h-[calc(100vh-140px)]` inner box guessed at a header height that varies with `env(safe-area-inset-top)`, clipping the last sections on notched devices and leaving dead space elsewhere, and nested scroll also costs iOS momentum scrolling. Don't reintroduce it.

`LegalModal` is now **AuthPage-only** — a modal is right at signup, where navigating away would abandon registration. Settings links to the routes instead.

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

`useDataManagement.ts` owns the GDPR right-of-access export (CSV + JSON, both download together because the policy promises both formats) and `logPrivacyAction()`. Deletion is deliberately *not* in this hook — a second deletion path would give the app two contradictory answers to "is my account gone?".

Audit rows go to `public.audit_log` (migration `20260730000000_add_privacy_audit_log.sql`), whose RLS grants own-row SELECT and INSERT only — no UPDATE or DELETE, because an audit trail the subject can rewrite is not an audit trail. Log **before** `signOut()`; the INSERT policy needs a live session. Audit writes never block the action they describe.

Note `public.users` is keyed to auth by `user_id`; `id` is a separate surrogate PK. Matching on `id` silently updates zero rows and PostgREST reports success.

Compliance docs: `docs/legal/PRE_LAUNCH_CHECKLIST.md`, `docs/legal/INCORPORATION_CHECKLIST.md`, `docs/supabase/DPA_ADDENDUM.md`. Note `docs/` and `*.sql` are gitignored — commit these with `git add -f`.

### Ads (AdMob banner, free Android users)

One anchored adaptive banner via `@capacitor-community/admob`, for signed-in non-premium users on
**Android only**. `src/lib/ads.ts` holds the pure gate (`shouldShowBanner`) and unit-ID resolution;
`src/hooks/useAdBanner.ts` holds every side effect. iOS is deliberately excluded — it needs the ATT
prompt, SKAdNetwork IDs and a privacy-manifest entry, none of which exist yet.

**Bottom padding is `.pb-page-content`, never a hardcoded `pb-*`.** It resolves to
`140px + var(--ad-banner-h, 0px) + env(safe-area-inset-bottom)`, so it tracks the nav, the FAB,
the banner and the notch together. Dashboard shipped a hardcoded `pb-24` (96px) and had its last
feed rows stranded underneath the nav for every free Android user. Put it on the scroll container
(the `PullToRefresh`), which is where `ExpensesPage` and `BudgetPage` put it.

`useAdBanner()` is called once in `Layout.tsx`, and **that call site is the whole placement
policy**: Layout-group routes get a banner, `StandalonePage` routes (settings, profile, `/terms`,
`/privacy`, `/admin`) never do. Don't add route checks inside the hook — move the page instead.

The banner is a **native view layered over the WebView**; it does not resize it. `useAdBanner`
writes the reported height (dp, which is 1:1 with CSS px here) to `--ad-banner-h`, and
`BottomNavigation`, the FAB in `Layout`, and `.pb-page-content` all offset by it. The variable is
`0px` whenever no banner is showing, so web/iOS/Pro are untouched. Anything else pinned to the
bottom of the viewport must add `var(--ad-banner-h, 0px)` too.

`getBannerUnitId(nativeAppId)` returns Google's **test** ad unit unless all three hold:
`VITE_ADMOB_BANNER_ID` is set, `import.meta.env.PROD`, **and** the native package is
`io.synark.hisabify` (not `.staging`). Do not "fix" this to always use the real unit — serving or
clicking real ads from a debug build is what gets an AdMob account suspended, and there is no
appeal path worth relying on.

**The package-name check is not redundant with `PROD`.** `npm run build && npx cap sync` emits a
production web bundle regardless of which APK variant later wraps it, so a `.staging` build used
to pair Google's **test AdMob app ID** (from `manifestPlaceholders`) with our **real ad unit**.
AdMob will not serve that combination, and `useAdBanner` swallows the failure by design
(`logger.error` only — a failed ad must never break the app), so ads disappeared with no visible
error. `useAdBanner` reads the package name once via `App.getInfo()`; web or a failed call
resolves to `null`, which is treated as "not production" and serves test ads.

Verify this against a **built APK**, not the source tree — the whole bug was that the source
looked fine and the pairing only went wrong once a variant wrapped the bundle:

```
npm run verify:apk-ads -- android/app/build/outputs/apk/staging/app-staging.apk \
                          android/app/build/outputs/apk/release/app-release.apk
```

It reads each APK's real package name and manifest AdMob app ID, evaluates the APK's own
minified bundle to get the unit it would request at runtime, and asserts the per-variant policy
(staging entirely on Google's test publisher, release on the exact `ADMOB_APP_ID_RELEASE`).
Publisher equality alone is not enough: two apps in one AdMob account share a publisher, and
pairing this account's unit with a different app in it is still a silent no-fill.

It also warns when the APK is older than `ads.ts`, `useAdBanner.ts`, `useRevenueCat.ts` or
`build.gradle` — a stale APK reports PASS about an artifact nobody is shipping.
Confirmed to report FAIL on a staging APK built without the package-name guard (test app ID
`~3347511713` + real unit `/5567338206`) and PASS for both variants with it.

Two native details are load-bearing:

- `com.google.android.gms.ads.APPLICATION_ID` in `AndroidManifest.xml` — the Mobile Ads SDK
  **crashes the app at startup** if it is absent or malformed, so it stays for every variant
  including `.staging` (which is unregistered and simply gets no fill). The value is the
  `admobAppId` manifest placeholder set per build type in `app/build.gradle`: Google's test app
  ID for debug and staging, `ADMOB_APP_ID_RELEASE` (from `local.properties` or the environment)
  for release, falling back to the test ID with a build warning when it is unset. Same reason as
  `getBannerUnitId()` — a real app ID in a debug build is how AdMob accounts get suspended.
- `patches/@capacitor-community+admob+8.0.0.patch` — the plugin ships three things AGP 9.3.1
  rejects: `apply plugin: 'kotlin-android'`, `android { kotlinOptions { } }` (see the Gradle
  section above), and `getDefaultProguardFile('proguard-android.txt')`, which AGP 9 refuses
  because it forces `-dontoptimize`. Use `proguard-android-optimize.txt`.

Consent: the plugin's mandated order is `initialize → requestConsentInfo → showConsentForm →
showBanner`, memoised in `initAdMob()` so it runs once per session. `useAdPrivacyOptions()` (same
file) backs the `Profile → Data & Privacy → Ad privacy settings` row — **Google's UMP terms
require that persistent entry point** for anyone who was shown a form; it is not optional UI. It
re-derives consent state itself rather than sharing with `useAdBanner`, because `/profile/data` is
a `StandalonePage` route outside `Layout`.

`PrivacyOptionsRequirementStatus` is compared as a string: the plugin's `consent/index` doesn't
re-export that enum, so it is unreachable from the package root.

The privacy policy in `src/lib/legalContent.tsx` was rewritten for this (advertising identifier
disclosure, AdMob in the third-party lists, consent as the GDPR lawful basis). It previously
promised the exact opposite. Any change to what ads collect has to go back into that file, plus
the Play Console "Contains ads" and Data safety declarations.

### Error states & offline

**Never leave a spinner with no error branch.** A failed fetch that renders the empty state is
the bug this section exists to prevent: for a long time a dead connection showed "No debts
tracked", "All caught up", and empty charts — indistinguishable from a clean account.

`ErrorState` (`src/components/ErrorState.tsx`) is the one error/empty block. Four variants —
`offline | server | notFound | generic`. Offline and notFound get the neutral `bg-muted/40` badge,
server and generic the `bg-destructive/10` one, because an offline device is not the user's fault
and should not read as an alarm. **Pages should render `DataErrorState`** (same file), which takes
the raw `error` and classifies it itself; reach for `ErrorState` directly only when the variant is
already known (the 404 route, `ErrorBoundary`).

The classification is a pure function, `toErrorVariant()` in `src/lib/errorState.ts` (same pattern
as `ads.ts` / `theme.ts` / `subscriptionStatus.ts`), over the `toAppError()` taxonomy that already
lived in `src/lib/errors.ts` and had no callers.

Three things `toAppError` has to get right, all of which it previously got wrong:

- **A Supabase/PostgREST failure is a plain object, not an `Error`.** An `instanceof Error` check
  alone classified every single backend failure as `UNKNOWN_ERROR`. It now reads `status` off any
  shape — and deliberately ignores `PostgrestError.code`, which is a Postgres SQLSTATE (`23505`),
  not an HTTP status.
- **`fetch` rejects with engine-specific text**: "Failed to fetch" (Chromium), "Load failed"
  (WebKit), "NetworkError when attempting to fetch resource" (Gecko). Matching one spelling misses
  the other two.
- A transport failure carries **no status at all**, which is what distinguishes it from a 5xx.

**Connectivity is two signals, never one.** `useOnline()` (`src/hooks/useOnline.ts`,
`useSyncExternalStore` over the `online`/`offline` events — no `@capacitor/network`, it works in
the WebView) reports *link* state, so a captive portal reads as online. `toErrorVariant` therefore
also maps a `NETWORK_ERROR` to `offline` even when the device claims otherwise. `OfflineBanner`
renders from `Layout`, anchored at the **top** on purpose: anything pinned to the bottom of the
viewport has to offset by `var(--ad-banner-h, 0px)`, and the top sidesteps that entirely.

**`useAuth`'s session bootstrap must clear `loading` on every path.** It used to clear it only
inside `.then()`, with no `.catch()`, so a rejected `getSession()` left `ProtectedRoute` spinning
forever with no way out. There is now a `.catch()`, a `finally`, and a `BOOTSTRAP_TIMEOUT_MS`
ceiling — a promise that never settles still terminates in an error screen. `retryBootstrap()`
re-runs it. Do not reintroduce a spinner that is not bounded by something.

`ErrorBoundary` is mounted at the app root **and** around each route-level `<Suspense>` (in
`App.tsx`'s `StandalonePage` and in `Layout`). The route-level ones exist for the failed lazy
`import()` — offline navigation, or a stale bundle after a deploy — which otherwise escapes to the
root boundary and blanks the whole app. The `Layout` one is keyed on `location.pathname` so
navigating away from a crashed page clears it. Its retry bumps a `resetKey` to **remount** the
subtree; clearing `hasError` alone re-renders the same tree, so a child that throws during render
throws again immediately and the button looks dead.

Hooks own an `error` in state (`setError` in `catch`, `setLoading(false)` in `finally` — the
`useDashboardData` shape) and return it. A hook that returns `error` but whose consumer drops it is
the same bug in a different place; that was true of `useDashboardData`, `useBudgets`, `useCategories`
and `useRecurringExpenses` simultaneously. Fix swallowed errors at the shared function, not the
call site: `fetchNotifications()` returning `[]` on failure is what made a dead connection render
as "All caught up", so it now throws and its single caller classifies it.

Copy lives in the existing `errors.*` i18n block — extend it, don't add a namespace — and must be
added to **all three** locales. The `notFound` variant uses `errors.notFoundTitle/Description`,
which are resource-neutral because that variant also covers a deleted transaction; `NotFound.tsx`
passes the page-specific `notFound.title/description` explicitly.

Modals, sheets and forms keep their toasts. `SplashScreen`'s progress bar is fixed-duration and
fake — it cannot hang, and is not wired to real load state.

### Theme

`useTheme()` exposes **two different things and they are not interchangeable**: `theme` is what the
user picked (`'dark' | 'light' | 'system'`), `resolvedTheme` is what to render (`'dark' | 'light'`).
Any presentational light/dark branch reads `resolvedTheme`; only the settings selector reads
`theme`. Branching on the raw `theme` means `'system'` matches neither arm and silently falls
through to the wrong styling.

The pure part lives in `src/lib/theme.ts` (`resolveTheme`, `readStoredTheme`, `DEFAULT_THEME`),
next to its hook — same pattern as `ratingPrompt.ts` and `ads.ts`.

Three rules the previous implementation broke, all of which rendered Light on a dark device:

- **The DOM class must never wait on the network.** It applies synchronously from `localStorage`;
  the Supabase read is a best-effort reconcile in a `try/catch`. It used to be gated behind an
  `isInitialized` flag set only at the end of an un-`try/catch`ed async init, so any rejection
  (offline, cold start, logged out) left `<html>` with no class at all — and `index.css` defines
  `:root` as the *light* palette, with `.dark` overriding. No class means light.
- **Store `'system'` as `'system'`.** Resolving it to a concrete value before persisting destroys
  the choice, and the next cold start writes that concrete value back over the account's `'system'`.
- **One source of truth.** Settings must not keep its own copy of the selection.

`index.html` carries a blocking pre-hydration script that applies the class before first paint.
Without it every cold start flashes light. Don't remove it.

### Activity feed

`mergeActivityFeed()` in `src/lib/activityFeed.ts` is the single definition of the feed:
`activity_log` rows and `transactions` interleaved by recency. `Dashboard` renders its first 5,
`ActivityHistoryPage` (`/activity`) renders all of it. `formatActivityDescription()` there owns
the `key|param|param` parse **and** the legacy English-string fallback for old DB rows.

Both used to live inline in `Dashboard.tsx`, and `/activity` read `activity_log` alone — which is
why it was empty for most users. **`activity_log` only ever receives debt events**: the sole writer
is `useAnalytics.logActivity`, called only from debt CRUD. `useActivityHistory.logActivity` exists
with zero callers. The page's icon map already anticipates ~23 activity types that nothing writes;
wiring up the remaining writers is the real fix, and merging transactions is what makes the page
correct in the meantime.

### Transaction row actions

`TransactionItem` reveals Edit/Delete on **long press** — 500ms, cancelled by 10px of travel
(`LONG_PRESS_MS`, `LONG_PRESS_MOVE_TOLERANCE_PX`). Plain pointer events, no gesture library.

Do not reintroduce `drag="x"`. Swipe-to-reveal competed with the list's own scrolling and fired on
momentum; the movement tolerance is what makes a hold distinguishable from a scroll, so any
reimplementation needs it. `didLongPress` swallows the synthetic click after a hold so a hold never
also navigates to `/transactions/:id`, while a plain tap still does. The hold only arms when
`onEdit`/`onDelete` are passed — `BudgetTransactionsSheet` passes neither and correctly reveals
nothing. Long press is unreachable by keyboard and screen reader **by design**: those users get the
same actions on `TransactionDetailsPage`, so don't build a parallel menu.

### Recurring Transactions

Subscription/bill templates in `recurring_expenses` that auto-log an expense each period. UI is `src/pages/more/RecurringExpensesPage.tsx` at `/more/recurring`; data via `useRecurringExpenses.ts`.

All the logic is in Postgres — `public.process_recurring_expenses()` (`supabase/migrations/20260729111611_process_recurring_expenses.sql`). **Do not reimplement materialisation client-side.** The function inserts one transaction per missed period, advances `next_due_date`, stamps `last_created_date`, and tags rows `recurring`. Idempotency comes from advancing the cursor in the same transaction as the insert, so re-running is a no-op — which is what makes it safe to call from two places:

- `process-recurring-expenses` pg_cron job, nightly at 00:05 UTC (no JWT → `auth.uid()` is null → all users)
- `processRecurringExpenses()` on every app open (JWT present → only that user)

That single `auth.uid() is null or user_id = auth.uid()` clause is what keeps a SECURITY DEFINER function from letting one user materialise another's templates. The app-open call is deliberate redundancy: the payment-reminder cron sat dead for four months before anyone noticed, so recurring does not depend on cron alone.

Templates are created in the user's base currency and inserted with `exchange_rate = 1`. There is no conversion because `public.exchange_rates` is empty — the app caches rates in memory client-side, so Postgres has no rate to honestly apply. Keep the currency picker out of the template form unless that changes.

Catch-up is capped at 24 periods per template per run; the remainder is picked up by the next tick.

### Page Transitions

Route-level transitions are **disabled on purpose**. Animating the whole route tree fought with the scroll restore in `Layout.tsx` and the Suspense fallback swap, which read as a glitch on navigation. `src/lib/pageMotion.ts` now exports no-op variants and `PageTransition.tsx` is a plain container. Do not reintroduce `AnimatePresence` around `<Outlet />`. Per-component motion inside a page is fine.

Each route owns its own `Suspense` boundary. Do not reintroduce a single app-root fallback for route chunks: it unmounts the header and bottom navigation on every lazy navigation.

### Page chrome: one appbar per page

Two appbars exist, and the route decides which one you get. **Never render both, and never
hand-roll a third.**

- **Tab routes** — the five paths in `NAV_TABS` (`src/lib/navTabs.ts`). `Layout` renders
  `Header` (avatar, notifications, menu) for these, gated on `isTabRoute()`. `Header` has no
  back mode; it is landing-only and `Layout` is its sole caller.
- **Everything else** — the page renders `<PageShell title backTo>` (`src/components/PageShell.tsx`):
  a compact bar with a back button and title, no avatar, no hamburger. `PageShell` owns
  `env(safe-area-inset-top)`, because no `Header` sits above it.

`NAV_TABS` is the single source of truth for the bottom nav, the desktop sidebar, and
`isTabRoute`. Adding a tab means adding it there and nowhere else; the three used to keep
separate copies.

Which route group a child page belongs to decides only whether the bottom nav is present:

| | Route group | Chrome |
|---|---|---|
| **Inside a parent** (`/debts`, `/activity`, `/categories`, `/more/*`, `/transactions/:id`) | `Layout` group in `App.tsx` | `PageShell` + bottom nav + FAB + sidebar |
| **Isolated** (`/settings/*`, `/profile/*`, `/support`, `/faq`, `/notifications`, `/admin`, `/terms`, `/privacy`) | `StandalonePage` group | `PageShell` only |

Pass `withBottomNav` from Layout-group pages. It controls **bottom padding only** — the nav
itself comes from `Layout`.

This replaced eight hand-copied bar blocks (identical apart from the title) plus a parallel
`<Header showBack>` convention on ten more pages. Every one of those pages was rendering two
stacked bars, because `Layout` drew its own header underneath. If you find yourself writing
`sticky top-0 z-40 bg-background/80 …`, you want `PageShell`.

### Overlays: never stack two of them

The app runs **three** overlay systems with no shared z-scale: Radix Dialog (`z-[55]`),
Radix Sheet (`z-[60]`), and react-modal-sheet (`base-modal-sheet.tsx`, its own portal).
Which one wins is incidental, so a modal opened from inside another modal renders wrong —
double-dimmed backdrop, two close buttons, one card floating over the other.

Transaction details is a **page** (`/transactions/:id`, `TransactionDetailsPage.tsx`), not a
dialog, precisely so `AssignmentSheet` and `EditTransactionModal` each open as a single layer
over it.

It is a `PageShell` page like every other non-tab route — see "Page chrome" below. It replaced `TransactionDetailsDialog`, which nested `AssignmentSheet` inside its
`DialogContent`. Do not turn it back into a modal, and do not render a Sheet or
`BaseModalSheet` from inside a `DialogContent` anywhere else — put the trigger on a page.
`src/components/ui/__tests__/dialog-sheet-stacking.test.tsx` guards the Sheet-over-Dialog
z-order for the one remaining nested case (`SuggestionBanner`).

Amounts on the details page are converted live via `useExchangeRate`, matching how
`ExpensesPage` renders the list row. Do **not** read `transactions.amount_converted` for
display: it is frozen at the base currency in force when the row was written, so it disagrees
with the list the moment a user switches base currency.

### Gamification (Health Score)

- Location: `src/features/gamification/`
- Formula: 40% budget + 30% savings + 30% activity
- Displayed on dashboard
- Pure calculation in `healthScoreLogic.ts`
- Tests in `__tests__/useHealthScore.test.ts`

### Referral System

- Location: `src/features/referrals/`
- Each user gets unique referral code
- New users redeem codes for credits
- Hook: `useReferral.ts`
- Backend: `reward_referral()` RPC or manual update

### Subscription & Feature Gating

Billing is **RevenueCat**, native-only. There is no Stripe integration and no web purchase path.

- `useRevenueCat.ts` owns the SDK: entitlement id `hisabify-pro` (`ENTITLEMENT_ID`), plan →
  package mapping, purchase/restore, and the RevenueCat-hosted paywall and Customer Center.
- `useSubscription()` is the app-facing hook. `isPremium` = an active RevenueCat entitlement
  **or** a time-boxed referral grant (`users.referral_granted_until`). `PremiumGuard` wraps
  gated UI.
- `users.subscription_type` (`'base' | 'pro'`) is a **mirror**, written from
  `updatePremiumState` on every entitlement *transition* — upgrades and downgrades both. It is
  not the source of truth — never gate a feature on it alone. The write is deliberately in
  `updatePremiumState` rather than at the purchase/restore call sites: expiry, refund and
  cancellation only ever arrive through `addCustomerInfoUpdateListener` and the foreground
  refresh, which is why an upgrade-only sync left rows stuck at `pro`/`active` forever.
  Note the DB CHECK is `('base','pro')` — the downgrade value is `'base'`, not `'free'`.
  The last mirrored value is cached in `localStorage` per user (`hisabify:subscription-mirror:<id>`)
  and only recorded **after** the update is confirmed to have matched a row. That cache is not an
  optimisation detail: without it, syncing both directions issues a redundant UPDATE for *every
  free user on every cold start* — a write the old upgrade-only code never made. A failed or
  zero-row write is deliberately not cached, so it retries next launch.
- The plugin is `import()`ed lazily and only when `Capacitor.isNativePlatform()`. Do not import
  `@revenuecat/purchases-capacitor` at module scope: the plugin is a Capacitor Proxy that
  intercepts *all* property access including `.then`, so returning it from an `async` function
  fires the native bridge and throws `Purchases.then() is not implemented on android`. Wrap it
  in a plain object (see `loadPlugin()`).

**`ENTITLEMENT_ID` must equal the RevenueCat entitlement *identifier*, exactly.** `entitlements.active`
is keyed by identifier, so a near-miss silently returns `false` for a genuinely paying customer —
they are charged, stay locked out, and keep seeing ads. An audit found the code checking
`'hisabify-pro'` against a dashboard identifier of `"Hisabify Pro"`. Identifiers cannot be renamed
in RevenueCat; changing one means creating a new entitlement and archiving the old, which is only
cheap while there are no live subscribers.

**Never match `public.users` on `id`.** It is a `gen_random_uuid()` surrogate PK; `user_id` is the
auth uid. `.eq('id', authUid)` matches zero rows, and supabase-js `.update()` without `.select()`
sends `Prefer: return=minimal`, so PostgREST answers **204 with `error === null`** — a silent
no-op that no `if (error)` will ever catch. This bug lived in three places (the hook plus both
webhook paths). Any update to a user row should `.select()` back and warn on an empty match.

Two more things the SDK will not tell you: the configure guard must key on the **user id**, not a
bare boolean, or a second account signing in on the same process inherits the first account's
entitlement; and `addCustomerInfoUpdateListener` is required, because without it an expiry or
refund mid-session leaves Pro unlocked until the next foreground.

**`/settings/subscription` is the one manage surface.** `SubscriptionPage` renders a status card
(plan term, renews-on / access-until, store, trial and billing-issue notices) and delegates every
action: `CustomerCenterTrigger` for cancel/change-plan/refund, `UpgradeModal` for upgrades,
`restorePurchases` for restores. It is reachable from `Settings → Subscription` and from
`Profile → Personal`, which now *navigates* here rather than mounting its own
`CustomerCenterTrigger` — two copies of the trigger is how the two surfaces diverged before.

The branching is a pure function, `deriveSubscriptionStatus()` in `src/lib/subscriptionStatus.ts`
(same pattern as `ads.ts` / `theme.ts` / `ratingPrompt.ts`), returning
`pro | referral | free | unavailable`. Three things it exists to get right:

- **`EntitlementInfo.periodType` is `NORMAL | INTRO | TRIAL | PREPAID`, not the billing term.**
  Monthly vs yearly has to be read off the product identifier; `expirationDate === null` is the
  only reliable lifetime signal, and rendering it as a date prints "Invalid Date".
- **No entitlement on web is not "free".** RevenueCat is native-only here, so `customerInfo` is
  always null in a browser — the page returns `unavailable` and says subscriptions are managed in
  the app rather than telling a paying subscriber they are on the free plan. A live referral grant
  still shows, because that comes from Supabase.
- **`willRenew: false` with a future `expirationDate` is the state users most need to see** — the
  subscription is cancelled but still active. The card says so explicitly.

The page reads live RevenueCat state, never `users.subscription_type` / `subscription_status`.
The mirror now syncs downgrades too, but it is still only as fresh as the last app launch —
an expiry that happens while the app is closed is not written until the user returns.

`supabase/migrations/20260828000000_reset_stale_pro_mirror.sql` repairs the rows stranded at
`pro`/`active` by the old upgrade-only sync. `npm run verify:migration` executes it against a
throwaway DB carrying the real CHECK constraint and asserts it hits the intended rows, leaves
every other row alone, is idempotent, and matches on `lower(btrim(email))` — an exact `IN (...)`
silently no-ops on a differently cased address, and a migration that updates zero rows looks
exactly like one that worked.

Native purchases require a **Play Store app configured in RevenueCat with a Play service-account
credential**. A `.staging` build (`applicationIdSuffix`) can never transact — its package is not in
Play — so testing billing needs a production-id build from an internal testing track.

## Testing

**Unit/integration:** Vitest + Testing Library (jsdom). **E2E:** Playwright.

`npm test` is watch mode; `npm run test:unit` is the single-run form and `npm run test:coverage`
is what CI runs (`.github/workflows/ci.yml`: lint → unit tests + coverage; E2E is a separate
manual workflow).

**Test Setup:** `src/test/setup.ts` also polyfills `ResizeObserver` and `matchMedia`, which jsdom
lacks — `react-modal-sheet` constructs a `ResizeObserver` on render, so without it any component
that merely *contains* a `BaseModalSheet` throws before a single assertion runs. `vite.config.ts` injects dummy `VITE_SUPABASE_*` values into
the test env because `src/lib/env.ts` validates with zod and **throws at import** when they are
missing — unit tests never hit the network, so no secrets are needed.

**Test File Naming:**
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.tsx`
- Location: Co-located with source files or in `__tests__/` folders

**When writing tests:**
- Use Vitest + Testing Library
- Test pure functions (e.g., `healthScoreLogic.test.ts`)
- Mock Supabase client for integration tests
- Add/update tests for new hooks, utilities, and behavior changes
- Run `npm run lint` and `npm run test` before opening PRs

**No enforced coverage gate** - focus on testing key logic paths

### E2E (Playwright)

Specs live in `e2e/*.spec.ts`; `playwright.config.ts` sets `testDir: './e2e'` and
`testMatch: '**/*.spec.ts'` so `global-setup.ts` and `fixtures/` are excluded.

`e2e/global-setup.ts` logs in once and saves `storageState` to `e2e/.auth/*.json`, which every
spec reuses (`auth.spec.ts` overrides it). That needs **two real Supabase users** — copy
`.env.test.example` to `.env.test` and fill in `E2E_REGULAR_*` (free) and `E2E_PRO_*` (premium).
`.env.test` is gitignored.

Base URL defaults to `http://localhost:8080` locally and `http://localhost:4173` in CI; override
with `E2E_BASE_URL`. Start a dev server before running.

## Capacitor Mobile

**Config:** `capacitor.config.ts`
**App ID:** `io.synark.hisabify`

**Where the native app loads the web app from** is the `APP_ENV` environment variable read by
`capacitor.config.ts` at sync time — **not** an edited-in-place constant. Never commit a change to
that file to point at your machine; set the env var on the `cap sync` instead.

| `APP_ENV` | `server` block | Use |
|---|---|---|
| `production` (default) | none — loads bundled `dist/` | Release builds |
| `staging` | `server.url = STAGING_URL` (default `https://hisabify-pi.vercel.app`) | Testers on a remote build |
| `local` | localhost dev server | Hot reload on a device/emulator |

`webContentsDebuggingEnabled` is on for everything except `production`.

**Localhost Development Workflow:**
1. Find your local IP: `npm run local-ip`
2. Point `capacitor.config.ts`'s local URL at the right host — Android emulator `http://10.0.2.2:8080`,
   Android device your LAN IP, iOS simulator `http://localhost:8080`
3. Start dev server: `npm run dev` (or `npm run dev:managed`)
4. Sync with `APP_ENV=local npx cap sync`, then `npm run dev:android` / `npm run dev:ios`

**Production Build:**
```bash
npm run build
npx cap sync
npx cap open ios    # Opens Xcode
npx cap open android # Opens Android Studio
```

**Mobile-specific features:**
- Pull-to-refresh (`usePullToRefresh.tsx`)
- Mobile-responsive bottom navigation
- Geolocation for currency detection
- Runtime permission handling (`usePermissions.ts`)
- Localhost support with hot reload (HMR)
- GPU-accelerated animations (60fps)
- Platform-specific optimizations (see `src/index.css`)

**Documentation:** See the "Localhost Development Workflow" under Capacitor Mobile above.

### Android Gradle: AGP 9 + Kotlin in node_modules plugins

AGP 9.3.1 registers its own `kotlin` extension (built-in Kotlin — `android.builtInKotlin` is left at its
default in `android/gradle.properties`). Two consequences for Capacitor plugin `build.gradle` files:

- **Never `apply plugin: 'org.jetbrains.kotlin.android'`** in a subproject. It fails at configuration with
  `Cannot add extension with name 'kotlin', as there is an extension already registered with that name`,
  and the cascading `does not specify compileSdk` error is just fallout from the aborted evaluation.
- **`android { kotlinOptions { } }` no longer exists** — it came from KGP. Use the top-level
  `kotlin { compilerOptions { jvmTarget = JvmTarget.JVM_… } }`, importing
  `org.jetbrains.kotlin.gradle.dsl.JvmTarget` (KGP is still on the buildscript classpath for the DSL types).

Both RevenueCat plugins ship the KGP `apply` line and need this treatment. **Do not hand-edit
`node_modules` to fix it** — that was the state this repo was in, and it silently reverts on `npm install`,
which is how `-ui` ended up half-fixed (KGP removed, `kotlinOptions` left behind). Fixes live in
`patches/`, reapplied by `patch-package` via the `postinstall` script. To change one: edit the file in
`node_modules`, then `npx patch-package <pkg>` — and `rm -rf <pkg>/android/build` first, or the Gradle
output directory lands in the patch (a 1KB patch becomes 99KB of `.dex`).

Capacitor 8 modules compile at Java 21, so javac must *be* 21 or they fail with `invalid source release: 21`.
The `java-base` toolchain in `android/build.gradle`'s `allprojects` block pins 21 and lets the foojay
resolver in `settings.gradle` download it, so no specific system JDK is required.

## Type Safety

- Path alias: `@/*` → `./src/*`
- Supabase types auto-generated in `src/integrations/supabase/types.ts`
- Core domain types in `src/types/index.ts`

## Important Files Reference

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component, routing, providers |
| `src/hooks/useAuth.tsx` | Authentication context |
| `src/hooks/useTransactions.tsx` | Transaction management |
| `src/hooks/useBudgets.tsx` | Budget management |
| `src/hooks/useCurrency.tsx` | Multi-currency support |
| `src/hooks/useVoiceInput.ts` | Voice transcription (Web Speech API) |
| `src/hooks/usePermissions.ts` | Runtime permission handling (native apps) |
| `src/types/index.ts` | Core type definitions |
| `src/integrations/supabase/client.ts` | Supabase singleton |
| `src/lib/security.ts` | Security utilities |
| `src/lib/logger.ts` | Logging service |
| `src/lib/imageProcessor.ts` | Receipt image optimization |
| `src/components/Layout.tsx` | Main layout wrapper (tab `Header`, bottom nav, FAB, sidebar) |
| `src/components/PageShell.tsx` | Compact appbar + content shell for every non-tab page |
| `src/lib/navTabs.ts` | The five tabs — bottom nav, sidebar, and `isTabRoute` |
| `src/components/RatingSheet.tsx` | Star rating + comment bottom sheet |
| `src/components/FeedbackSheet.tsx` | Feedback bottom sheet (type, description, attachments) |
| `src/components/PageTransition.tsx` | Route enter animation + delayed Suspense fallback |
| `src/lib/pageMotion.ts` | Shared page transition variants (reduced-motion aware) |
| `src/lib/appStore.ts` | Play Store listing link + app version helper |
| `src/pages/AdminPage.tsx` | Admin DB viewer (`/admin`) |
| `src/pages/TransactionDetailsPage.tsx` | Transaction details (`/transactions/:id`) — a page, not a modal |
| `src/lib/legalContent.tsx` | Terms of Service + Privacy Policy copy |
| `src/components/SubscriptionTermsContent.tsx` | Subscription & billing terms copy |
| `src/components/LegalDocPage.tsx` | Shared shell for routed legal docs (chrome + "Last updated") |
| `src/pages/TermsPage.tsx` | Terms & Conditions page (`/terms`) — ToS + Subscription & Billing |
| `src/hooks/useDataManagement.ts` | GDPR data export (CSV/JSON) + privacy audit logging |
| `src/pages/profile/DataPage.tsx` | Data & Privacy: export, analytics opt-out, deletion |
| `src/lib/ratingPrompt.ts` | Pure rating-prompt scheduling logic |
| `src/lib/theme.ts` | Pure theme resolution + persistence (`resolveTheme`, `readStoredTheme`) |
| `src/lib/activityFeed.ts` | The one merge of `activity_log` + `transactions`, and the description parser |
| `src/pages/ActivityHistoryPage.tsx` | Full activity feed (`/activity`) — same feed the Dashboard previews |
| `src/lib/ads.ts` | Ad unit IDs + the pure `shouldShowBanner` gate |
| `src/components/ErrorState.tsx` | The one error block (`ErrorState`) + the page-level `DataErrorState` |
| `src/lib/errorState.ts` | Pure error -> variant mapping (`toErrorVariant`) |
| `src/hooks/useOnline.ts` | Live connectivity flag (no native plugin) |
| `src/components/OfflineBanner.tsx` | Mid-session offline bar, rendered from `Layout` |
| `src/hooks/useAdBanner.ts` | AdMob init, UMP consent, banner lifecycle, `--ad-banner-h` |
| `src/hooks/useRecurringExpenses.ts` | Recurring expense CRUD + `process_recurring_expenses()` RPC |
| `src/pages/more/RecurringExpensesPage.tsx` | Recurring expense manager (`/more/recurring`) |
| `src/hooks/useAppRating.ts` | Rating prompt cadence + persistence |
| `src/hooks/useAppFeedback.ts` | Submits ratings and feedback to `app_feedback` |
| `src/components/InputMethodSheet.tsx` | Unified FAB action menu (3 options) |
| `src/components/VoiceInputFlow.tsx` | Enhanced voice memo UI with animations |
| `src/components/ReceiptScannerModal.tsx` | Receipt OCR (Gemini Vision) + storage |
| `TRD.md` | Technical requirements & architecture |
| `PRD.md` | Product requirements & roadmap |
| `src/lib/env.ts` | zod-validated env schema (throws at import when misconfigured) |
| `src/hooks/useRevenueCat.ts` | RevenueCat SDK: entitlement, purchases, paywall, Customer Center |
| `src/hooks/useSubscription.tsx` | App-facing premium check (entitlement OR referral grant) |
| `src/pages/settings/SubscriptionPage.tsx` | Manage Subscription (`/settings/subscription`) — status card + Customer Center |
| `src/lib/subscriptionStatus.ts` | Pure derivation of the subscription display state |
| `playwright.config.ts`, `e2e/` | E2E suite + shared logged-in `storageState` |

## Development Workflow

1. **Adding a new feature:**
   - Create domain hook in `src/hooks/useFeature.tsx`
   - Build UI components using shadcn primitives
   - Add page in `src/pages/FeaturePage.tsx`
   - Update routes in `src/App.tsx`
   - Add types in `src/types/index.ts`
   - Write tests in `__tests__/`

2. **Modifying Supabase schema:**
   - Update schema in Supabase dashboard or migration files
   - Regenerate types: `supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts`
   - Update affected hooks and components

3. **Adding UI components:**
   - Use existing shadcn components from `src/components/ui/`
   - Follow mobile-first responsive design
   - Use Tailwind CSS for styling
   - Add proper loading and error states

## Coding Style & Conventions

### TypeScript & React
- Use TypeScript with strict mode enabled
- Functional React components (no class components)
- Hooks for state and side effects

### Naming Conventions
- **PascalCase:** Components, pages, types/interfaces
  - Examples: `Dashboard`, `AddTransactionModal`, `Transaction`
- **camelCase:** Variables, functions, hooks
  - Examples: `userId`, `fetchTransactions`, `useAuth`
- **Hooks:** Always prefix with `use`
  - Examples: `useTransactions`, `useBudgets`, `usePermissions`
- **Files:** Match component name
  - Component: `AddTransactionModal.tsx`
  - Hook: `useTransactions.tsx`
  - Utility: `security.ts`

### Code Formatting
- 2-space indentation
- Semicolons required
- Consistent import ordering:
  1. React/external libraries
  2. Internal `@/` imports
  3. Relative imports
  4. Types

### Component Guidelines
- Treat `src/components/ui/` as shared primitives (shadcn)
- Wrap or extend instead of directly editing UI primitives
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks

## Commit & Pull Request Guidelines

### Branch Naming
- `feat/` - New features (e.g., `feat/voice-input`)
- `fix/` - Bug fixes (e.g., `fix/budget-calculation`)
- `chore/` - Maintenance tasks (e.g., `chore/update-deps`)

### Commit Messages
- Use imperative mood (e.g., "Add voice input", "Fix budget overflow", "Refactor useTransactions")
- Keep first line under 72 characters
- Add detail in commit body if needed

### Pull Request Requirements
- **Problem & Solution:** Clear description of what and why
- **Linked Issue:** Reference related issue/ticket
- **Screenshots/Recordings:** For UI changes
- **Testing Notes:** Commands run + key results
- **Checklist:**
  - [ ] `npm run lint` passes
  - [ ] `npm run test` passes
  - [ ] Manual testing completed
  - [ ] Documentation updated (if needed)

## Security & Environment Variables

- **Never commit `.env` files** - Use `.env.example` as template
- **Client-exposed vars:** Must be prefixed with `VITE_`
  - Example: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (**not** `..._ANON_KEY` —
    `src/lib/env.ts` validates the schema with zod and throws on import if a required var is
    missing or malformed, so a wrong name fails the whole app at boot, not at first query)
  - `.env.example` is the full list; `GEMINI_API_KEY` (unprefixed) is server-side only
- **Secret keys:** Never in client code - use Supabase Edge Functions
- **Schema changes:** Add migration in `supabase/migrations/` and regenerate types

## Common Patterns to Follow

- **Always use optimistic updates** for better UX
- **Subscribe to real-time changes** with debouncing
- **Handle currency conversion** at display time
- **Validate and sanitize** user input (see `src/lib/security.ts`)
- **Use toast notifications** for user feedback
- **Implement loading states** for async operations
- **Revert optimistic updates** on error
- **Prevent duplicate fetches** with refs
- **Log errors** with Logger service
- **Request permissions contextually** before using camera/microphone (mobile)
- **Test on real devices** for mobile-specific features (permissions, camera, voice)

## Internationalization (i18n) & Translation Workflow

**Goal:** Ensure all hardcoded strings are extracted to translation files for full multi-language support (English, Japanese, Bengali).

**Translation Process:**
When you say `"translate <file_path> page"`, follow these steps:

1. **Audit for Hardcoded Strings**
   - Search for all quoted strings in the component
   - Identify UI text that should be translatable
   - Skip: variable names, object keys, technical strings, comments

2. **Consolidate & Deduplicate**
   - Check existing `src/i18n/locales/en/translation.json` for similar keys
   - Reuse existing keys when possible to avoid duplication
   - Organize new keys under logical sections (page name, feature, etc.)

3. **Add to English Translation**
   - Add new keys to `en/translation.json`
   - Use camelCase for keys: `settings.preferences`, `common.save`, etc.
   - Provide clear English text as values

4. **Add to Japanese & Bengali**
   - Translate all new keys to Japanese (`ja/translation.json`)
   - Translate all new keys to Bengali (`bn/translation.json`)
   - Maintain consistent terminology across translations

5. **Update Component Code**
   - Replace hardcoded strings with `t('key')` calls
   - Ensure `useTranslation()` hook is imported: `const { t } = useTranslation();`
   - Provide fallback text (rarely used): `t('key') || 'Fallback Text'`

6. **Verify & Test**
   - All keys exist in all three language files (en, ja, bn)
   - No empty values in translation files
   - Component renders correctly with translated strings
   - Language switcher changes text appropriately

**Tools:**
- Use the **translate skill** (`/skills translate`) for automated assistance with the translation workflow
- Or follow the manual process above

**File References:**
- English: `src/i18n/locales/en/translation.json`
- Japanese: `src/i18n/locales/ja/translation.json`
- Bengali: `src/i18n/locales/bn/translation.json`
- Hook: `useTranslation()` from `react-i18next`

**Key Patterns:**
```typescript
// ✓ Good - Using i18n
const { t } = useTranslation();
const label = t('settings.preferences');

// ✗ Bad - Hardcoded
const label = 'Preferences';
```
