# Architecture

**Analysis Date:** 2026-03-19

## Pattern Overview

**Overall:** Nested Context + Custom Hooks + Component-Based Architecture

**Key Characteristics:**
- React 18 with TypeScript and Vite (SPA)
- Server-side data logic via Supabase (PostgreSQL + Auth + Edge Functions)
- Client-side data fetching and state management via custom hooks + React Context
- Global providers for auth, theme, currency, and error handling
- Optimistic UI updates for perceived performance
- Real-time subscriptions with debouncing to prevent excessive re-renders

## Layers

**Presentation Layer:**
- Purpose: React components for UI rendering
- Location: `src/components/`, `src/pages/`, `src/features/`
- Contains: Page components, domain-specific components (TransactionItem, BudgetCard), UI primitives from shadcn
- Depends on: Custom hooks, Context providers, UI libraries (Framer Motion, Phosphor Icons)
- Used by: React Router (routes)

**Data/State Layer:**
- Purpose: Fetch, cache, and manage application state
- Location: `src/hooks/` (context providers and custom hooks)
- Contains: `useAuth`, `useProfile`, `useCurrency`, `useBudgets`, `useDashboardData`, `useExchangeRate`, `usePaymentReminders`, `useSavingsGoals`, `usePermissions`, `usePushNotifications`, `useVoiceInput`
- Depends on: Supabase client, Logger, Exchange Rate Service
- Used by: Components and pages

**Integration Layer:**
- Purpose: External API communication
- Location: `src/integrations/supabase/`
- Contains: Supabase client singleton, auto-generated TypeScript types
- Depends on: Supabase SDK, environment variables
- Used by: Custom hooks

**Utility/Library Layer:**
- Purpose: Reusable functions and services
- Location: `src/lib/`
- Contains: Error handling, Logging, Security (rate limiting), Image processing, Analytics, Exchange rate caching, Currency formatting, Transaction utilities
- Depends on: External SDKs (Sentry for error logging, Firebase for analytics)
- Used by: Hooks, components, integration layer

**Feature Modules:**
- Purpose: Scoped feature implementations with their own hooks/components
- Location: `src/features/`
- Contains: Gamification (health score calculation), Referrals (user referral system)
- Pattern: Each feature has `/hooks/`, `/components/`, `/utils/`
- Depends on: Core data hooks
- Used by: Pages and components

## Data Flow

**User Interaction → Component → Hook → Supabase → Hook State Update → Component Re-render:**

1. User interacts with component (clicks button, enters form)
2. Component calls hook function (e.g., `useBudgets().createBudget()`)
3. Hook immediately updates local state (optimistic update)
4. Hook calls Supabase API asynchronously
5. On success: state persists; on error: state reverts
6. Component re-renders with new state
7. Real-time subscriptions trigger refetch if other users changed data

**Example: Adding a Transaction**
```
ExpensesPage.handleCreateTransaction()
  → AddTransactionModal calls onSave()
    → Hook: setTransactions([newTx, ...current])  // Optimistic
    → supabase.from('transactions').insert(...)
    → On error: setTransactions(current.filter(t => t.id !== tempId))  // Revert
    → useDashboardData refetches due to event listener
```

**State Management:**
- Local component state: `useState()` for UI-only state (modals, filters)
- Context state: Authentication, theme, currency preference, profile
- Fetched state: Transaction/budget/goal data from hooks (computed in hook, stored locally)
- Real-time updates: Supabase subscriptions with debouncing (1s delay)
- No Redux/Zustand: Context + custom hooks sufficient for app complexity

## Key Abstractions

**Authentication Context (`useAuth`):**
- Purpose: Manages user sign-up, sign-in, sign-out, session state
- Location: `src/hooks/useAuth.tsx`
- Pattern: React Context + Supabase auth
- Provides: user, session, loading, signUp(), signIn(), signInWithOAuth('google'), signOut()
- Features: PKCE flow for mobile (OAuth), email/password auth, rate limiting, password validation

**Profile Context (`useProfile`):**
- Purpose: User profile data, avatar, subscription status, preferences
- Location: `src/hooks/useProfile.tsx`
- Pattern: React Context + custom hook
- Fetches from: `users` table

**Currency Context (`useCurrency`):**
- Purpose: Multi-currency support with automatic geolocation detection
- Location: `src/hooks/useCurrency.tsx`
- Pattern: React Context + useExchangeRate hook
- Provides: currency, setCurrency(), formatAmount(), currencySymbol
- Features: Stores user preference in DB, detects location on first load, prefetches exchange rates

**Exchange Rate Hook (`useExchangeRate`):**
- Purpose: Caches and converts amounts between currencies
- Location: `src/hooks/useExchangeRate.tsx`
- Pattern: In-memory cache with 6-hour TTL, Supabase Edge Function for rates
- Deduplicates: Prevents parallel requests for same currency pair
- Provides: convertAmount(amount, fromCurrency, toCurrency), prefetchRates()

**Budgets Hook (`useBudgets`):**
- Purpose: Fetch, create, update, delete budgets; calculate spending
- Location: `src/hooks/useBudgets.tsx`
- Pattern: Optimistic updates + real-time subscription with debounce
- Deduplicates: isFetchingRef + lastFetchRef to prevent 500ms duplicate fetches
- Provides: budgets (with spending/status), createBudget(), updateBudget(), deleteBudget(), refetch()
- Features: Period-based (weekly/monthly/yearly), multi-currency support, budget alerts

**Dashboard Data Hook (`useDashboardData`):**
- Purpose: Aggregated dashboard metrics (total expenses, income, trends, budget vs actual)
- Location: `src/hooks/useDashboardData.tsx`
- Pattern: Single fetch for transactions + budgets, computed metrics
- Enforces: History window limits (free tier: 3 months, premium: unlimited)
- Provides: transactions, totalExpenses, totalIncome, categoryData, monthlyTrendData, budgetVsActualData, refetch()

**Permissions Hook (`usePermissions`):**
- Purpose: Runtime permission handling for mobile (camera, microphone, location)
- Location: `src/hooks/usePermissions.ts`
- Pattern: Capacitor Permissions API with graceful web fallback
- Provides: ensurePermission(type), isNative
- Supported: 'camera', 'photos', 'microphone', 'location'

**Voice Input Hook (`useVoiceInput`):**
- Purpose: Speech-to-text for transaction entry
- Location: `src/hooks/useVoiceInput.ts`
- Pattern: Promise-based blocking calls (no event listeners)
- Native: Capacitor Speech Recognition (auto-silence ~2-3s)
- Web: Web Speech API with jsdom polyfill
- Provides: listen() → Promise<string>, stop() → Promise<void>, parseCommand(text)

**Push Notifications Hook (`usePushNotifications`):**
- Purpose: Register device for FCM push notifications
- Location: `src/hooks/usePushNotifications.ts`
- Pattern: One-time registration on app start
- Platform: Android (FCM tokens), iOS (APNs), Web (fallback)
- Stores: Token in `push_notification_tokens` table

## Entry Points

**Web Entry Point:**
- Location: `src/main.tsx`
- Triggers: Browser navigation or direct URL access
- Responsibilities: React root render

**App Root Component:**
- Location: `src/App.tsx`
- Triggers: Entry point
- Responsibilities:
  1. Provider hierarchy setup (ErrorBoundary → QueryClient → Theme → Auth → Profile → Currency)
  2. Route definitions (React Router v6)
  3. Splash screen handling (first-time vs returning users)
  4. Android back button navigation
  5. Deep link handling (OAuth callback from native browser)
  6. Firebase Analytics user tracking
  7. Viewport height fix for mobile

**Route Structure:**
- `/`: Dashboard (protected)
- `/expenses`, `/analytics`, `/budget`, `/savings`, `/reports`: Feature pages (protected)
- `/profile`, `/profile/personal`, `/profile/data`, `/profile/invite`: Profile pages (protected)
- `/settings`, `/settings/preferences`, `/settings/notifications`: Settings (protected)
- `/notifications`: Notifications center (protected)
- `/auth`, `/auth/callback`: Authentication (public)
- `/onboarding`: First-time user guide (public)
- `/reset-password`, `/install`, `/privacy`, `/support`, `/faq`: Public pages

**Protected vs Public Routes:**
- `ProtectedRoute` wrapper: Redirects to `/auth` if not authenticated
- `AuthRoute` wrapper: Redirects authenticated users to `/`
- Routes without Layout: `SettingsPage`, standalone pages (no double header)
- Routes with Layout: Feature pages wrapped in header + bottom navigation

## Error Handling

**Strategy:** Global + Local + Granular

**ErrorBoundary Component (`src/components/ErrorBoundary.tsx`):**
- Catches React component tree errors
- Logs to logger service (development) + Crashlytics (production)
- Renders fallback UI with retry/home buttons
- Shows error details only in development

**Logger Service (`src/lib/logger.ts`):**
- Console logging in development
- Sentry integration prepared (commented out, requires `@sentry/react` install)
- Firebase Crashlytics integration for production errors
- Provides: debug(), info(), warn(), error(), apiCall(), userAction()

**AppError Class (`src/lib/errors.ts`):**
- Standardized error format with error codes (AUTH_ERROR, VALIDATION_ERROR, NETWORK_ERROR, etc.)
- Tracks isRetryable flag, original error, context
- Factory functions: createNetworkError(), createApiError(), createAuthError(), etc.
- toAppError() converter for unknown errors

**Patterns:**
- Hooks catch Supabase errors, log them, return null or empty state
- Components handle errors gracefully with try-catch or error callbacks
- Toast notifications for user-facing errors (sonner library)
- Async operations wrapped in try-catch with appropriate error handling

## Cross-Cutting Concerns

**Logging:**
- Logger singleton in `src/lib/logger.ts`
- Structured logs with context (userId, component, action)
- Graceful Sentry fallback if package not installed
- Firebase Crashlytics for production crash reporting

**Validation:**
- Input validation in security module (`src/lib/security.ts`)
- Email validation: `isValidEmail(email)`
- Password strength: `validatePasswordStrength(password)`
- Rate limiting: `loginRateLimiter.isAllowed(key)`
- User input sanitization on transaction forms

**Authentication:**
- Supabase Auth with PKCE flow (mobile-safe)
- Session persistence in localStorage
- OAuth (Google) integration with custom redirect URL scheme (native apps)
- Rate-limited sign-up/sign-in to prevent abuse
- Privacy policy acceptance tracking

**Real-time Sync:**
- Supabase Postgres Changes subscriptions for transactions, budgets, reminders
- Debounced refetch (1s delay) to batch rapid changes
- User ID filtering on subscriptions (RLS-level security)
- Optimistic UI updates to avoid perceived lag

**Multi-Currency:**
- Exchange rates fetched from Supabase Edge Function
- In-memory cache with 6-hour TTL
- Conversion at display time (not storage time)
- User preference stored in DB, auto-detected by geolocation

**Capacitor Mobile Integration:**
- Deep link handling for OAuth redirects (appUrlOpen event)
- Android back button support (history navigation)
- Push notifications registration (FCM tokens)
- Geolocation for currency detection
- Runtime permissions for camera, microphone, location
- Localhost dev server support with hot reload (HMR)

---

*Architecture analysis: 2026-03-19*
