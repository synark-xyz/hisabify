# Codebase Structure

**Analysis Date:** 2026-03-19

## Directory Layout

```
hisabify/
├── src/
│   ├── App.tsx                          # Root component: providers, routing, app logic
│   ├── main.tsx                         # React DOM entry point
│   ├── index.css                        # Global Tailwind + theme styles
│   ├── pages/                           # Route-level page components (one per major route)
│   │   ├── Dashboard.tsx                # Home / dashboard view
│   │   ├── ExpensesPage.tsx             # Transactions with calendar filtering
│   │   ├── AnalyticsPage.tsx            # Charts and spending insights
│   │   ├── BudgetPage.tsx               # Budget management
│   │   ├── SavingsPage.tsx              # Savings goals
│   │   ├── ReportsPage.tsx              # Export/report generation
│   │   ├── ProfilePage.tsx              # User profile summary
│   │   ├── SettingsPage.tsx             # Settings hub
│   │   ├── NotificationsPage.tsx        # Push notification center
│   │   ├── AuthPage.tsx                 # Sign in / sign up
│   │   ├── OnboardingPage.tsx           # First-time user guide
│   │   ├── ResetPasswordPage.tsx        # Password recovery
│   │   ├── PrivacyPolicyPage.tsx        # Legal content
│   │   ├── SupportPage.tsx              # Help & support
│   │   ├── FaqPage.tsx                  # FAQ
│   │   ├── InstallPage.tsx              # PWA install guide
│   │   ├── AuthCallbackPage.tsx         # OAuth callback handler
│   │   ├── NotFound.tsx                 # 404 fallback
│   │   ├── profile/                     # Profile sub-pages (nested routes)
│   │   │   ├── PersonalPage.tsx         # Personal info edit
│   │   │   ├── DataPage.tsx             # Data management / export
│   │   │   └── ReferralsPage.tsx        # Referral system
│   │   └── settings/                    # Settings sub-pages
│   │       ├── PreferencesPage.tsx      # Theme, currency, language
│   │       └── NotificationSettingsPage.tsx  # Push notification preferences
│   │
│   ├── components/                      # Reusable UI and feature components
│   │   ├── ui/                          # shadcn/Radix primitives (40+ components)
│   │   │   ├── button.tsx, input.tsx, dialog.tsx, modal.tsx, etc.
│   │   │   ├── chart.tsx                # Recharts wrapper
│   │   │   └── ...
│   │   ├── Layout.tsx                   # Main layout wrapper (header + bottom nav)
│   │   ├── Header.tsx                   # Page header with title/back button
│   │   ├── BottomNavigation.tsx         # Bottom tab navigation
│   │   ├── ErrorBoundary.tsx            # Global error boundary
│   │   │
│   │   ├── dashboard/                   # Dashboard-specific components
│   │   │   ├── SavingsSnapshotCard.tsx
│   │   │   └── ...
│   │   ├── analytics/                   # Analytics visualization components
│   │   │   ├── EnhancedAnalyticsChart.tsx
│   │   │   └── ...
│   │   ├── savings/                     # Savings goal components
│   │   │   └── ...
│   │   ├── reports/                     # Report generation components
│   │   │   └── ...
│   │   │
│   │   ├── TransactionItem.tsx          # Single transaction display
│   │   ├── AddTransactionModal.tsx      # Create transaction form
│   │   ├── EditTransactionModal.tsx     # Edit transaction form
│   │   ├── DeleteTransactionDialog.tsx  # Delete confirmation
│   │   ├── TransactionForm.tsx          # Shared form fields (merchant, amount, date, etc.)
│   │   │
│   │   ├── AddBudgetModal.tsx           # Create budget
│   │   ├── BudgetStatusCard.tsx         # Single budget display with spending bar
│   │   ├── BudgetDashboard.tsx          # Budget grid view
│   │   ├── DeleteBudgetDialog.tsx       # Delete confirmation
│   │   │
│   │   ├── AddPaymentReminderModal.tsx  # Create reminder
│   │   ├── PaymentReminderCarousel.tsx  # Upcoming reminders carousel
│   │   ├── ManageRemindersModal.tsx     # Reminder list and management
│   │   ├── PaymentRemindersManager.tsx  # Reminder calendar view
│   │   │
│   │   ├── ReceiptUpload.tsx            # OCR receipt capture + processing
│   │   ├── ReceiptScannerModal.tsx      # Receipt camera interface
│   │   ├── InputMethodSheet.tsx         # Unified FAB: Voice / Receipt / Manual entry
│   │   ├── VoiceInputFlow.tsx           # Voice recording UI with animations
│   │   │
│   │   ├── MonthCalendar.tsx            # Month picker
│   │   ├── SwipeableWeekCalendar.tsx    # Swipeable week selector
│   │   ├── MonthlyWrapCard.tsx          # Monthly summary card
│   │   │
│   │   ├── PullToRefresh.tsx            # Swipe-to-refresh gesture
│   │   ├── PremiumGuard.tsx             # Feature gating wrapper
│   │   ├── UpgradeModal.tsx             # Subscription upsell
│   │   ├── SplashScreen.tsx             # Loading splash (web)
│   │   ├── CyberpunkSplash.tsx          # Cyberpunk variant splash
│   │   ├── CyberpunkBackground.tsx      # Animated background (cyberpunk theme)
│   │   ├── ParticlesBackground.tsx      # Particle animation
│   │   ├── StreamingGreeting.tsx        # Animated greeting text
│   │   ├── LegalModal.tsx               # Privacy/legal acceptance
│   │   │
│   │   ├── ExpenseOverview.tsx          # Spending summary display
│   │   ├── ExpenseDonutChart.tsx        # Category spending visualization
│   │   │
│   │   ├── __tests__/                   # Component tests
│   │   │   └── *.test.tsx
│   │
│   ├── hooks/                           # Custom React hooks for data & logic
│   │   ├── useAuth.tsx                  # Authentication context + methods
│   │   ├── useProfile.tsx               # User profile context
│   │   ├── useCurrency.tsx              # Multi-currency context + provider
│   │   ├── useTheme.tsx                 # Theme (dark/light/cyberpunk) context
│   │   │
│   │   ├── useBudgets.tsx               # Budget CRUD + spending calculations
│   │   ├── useBudgetContext.tsx         # Budget UI state context
│   │   ├── useDashboardData.tsx         # Aggregated dashboard metrics
│   │   ├── useExchangeRate.tsx          # Currency conversion + caching
│   │   │
│   │   ├── useSavingsGoals.tsx          # Savings goal CRUD
│   │   ├── usePaymentReminders.ts       # Payment reminder CRUD + real-time
│   │   ├── useAdvancedAnalytics.tsx     # Analytics calculations
│   │   ├── useReportData.tsx            # Report generation data
│   │   │
│   │   ├── useVoiceInput.ts             # Voice-to-text with fallback
│   │   ├── usePermissions.ts            # Mobile permissions handling
│   │   ├── usePushNotifications.ts      # FCM token registration
│   │   ├── usePullToRefresh.tsx         # Gesture handling
│   │   ├── useReceiptUpload.tsx         # Receipt capture + upload
│   │   │
│   │   ├── useSubscription.tsx          # RevenueCat subscription status
│   │   ├── useRevenueCat.ts             # RevenueCat SDK wrapper
│   │   ├── useScreenTracking.ts         # Firebase Analytics page views
│   │   ├── useAndroidBackButton.ts      # Capacitor back button handling
│   │   ├── use-toast.ts                 # sonner toast hook
│   │   ├── use-mobile.tsx               # Mobile viewport detection
│   │   │
│   │   ├── useTransactionUpdateListener.ts  # Real-time transaction updates
│   │   ├── useTransactionsForReminders.ts   # Fetch transactions for reminder calculations
│   │   ├── useFirstTimeUser.ts          # First-time user detection
│   │   ├── useConvertedAmount.tsx       # Single amount conversion helper
│   │   ├── useCategories.ts             # Expense categories fetch
│   │   ├── useReportTemplates.tsx       # Report template selection
│   │   ├── useKeyboardHandler.tsx       # Input form keyboard behavior
│   │   ├── useVisualViewport.ts         # Mobile viewport height fix
│   │   ├── useSubscriptionPricing.ts    # Pricing plan data
│   │   │
│   │   ├── __tests__/                   # Hook tests
│   │   │   ├── useHealthScore.test.ts
│   │   │   └── ...
│   │
│   ├── features/                        # Scoped feature modules
│   │   ├── gamification/                # Health score calculation
│   │   │   ├── hooks/
│   │   │   │   └── useHealthScore.ts
│   │   │   ├── components/
│   │   │   │   └── HealthScoreCard.tsx
│   │   │   ├── utils/
│   │   │   │   └── healthScoreLogic.ts
│   │   │   └── __tests__/
│   │   │       └── useHealthScore.test.ts
│   │   └── referrals/                   # Referral system
│   │       ├── hooks/
│   │       │   └── useReferral.ts
│   │       └── components/
│   │           └── ReferralCard.tsx
│   │
│   ├── integrations/
│   │   └── supabase/                    # Supabase integration
│   │       ├── client.ts                # Supabase client singleton
│   │       └── types.ts                 # Auto-generated TypeScript types
│   │
│   ├── types/
│   │   └── index.ts                     # Core domain types (Card, Transaction, Budget, etc.)
│   │
│   ├── lib/                             # Shared utilities and services
│   │   ├── logger.ts                    # Logging service (console + Sentry + Crashlytics)
│   │   ├── errors.ts                    # AppError class + error factories
│   │   ├── security.ts                  # Input validation, rate limiting, password checks
│   │   ├── analytics.ts                 # Firebase Analytics integration
│   │   ├── notificationManager.ts       # Push notification & alert deduplication
│   │   │
│   │   ├── exchangeRateService.ts       # In-memory exchange rate caching
│   │   ├── imageProcessor.ts            # Receipt image optimization + compression
│   │   ├── savings.ts                   # Savings goal calculations
│   │   ├── transactionUtils.ts          # Transaction helpers (category name, color, etc.)
│   │   ├── transactionDateRange.ts      # Date range helpers for view modes
│   │   ├── historyLimits.ts             # Free vs premium history window enforcement
│   │   │
│   │   ├── env.ts                       # Environment variable helpers
│   │   ├── utils.ts                     # General utilities (cn class merge, etc.)
│   │   ├── viewport.ts                  # Mobile viewport height fix
│   │   ├── api.ts                       # API call helpers
│   │   ├── exportUtils.ts               # Data export helpers
│   │   ├── reportExports.ts             # Report generation
│   │   ├── recurringReminders.ts        # Reminder recurrence logic
│   │   ├── reminderAmount.ts            # Reminder amount calculations
│   │   ├── reminderDate.ts              # Reminder date calculations
│   │   ├── notifications.ts             # Notification helpers
│   │   ├── legalContent.tsx             # Privacy policy, terms, etc. content
│   │   ├── entitlements.ts              # Feature entitlement checks
│   │   ├── overlay-portal.ts            # React portal for modals
│   │   ├── profile-memory.ts            # Profile data caching
│   │   ├── transaction-events.ts        # Event emitter for transaction updates
│   │   ├── firebase-stub.ts             # Firebase stub for non-production
│   │   │
│   │   └── __tests__/                   # Utility tests
│   │       └── *.test.ts
│   │
│   └── test/
│       └── setup.ts                     # Vitest configuration + mocks
│
├── supabase/
│   ├── migrations/                      # Database schema migrations
│   └── functions/                       # Edge Functions
│       ├── schedule-payment-reminders/
│       └── ...
│
├── android/                             # Capacitor Android native project
├── ios/                                 # Capacitor iOS native project
├── public/                              # Static assets
├── capacitor.config.ts                  # Capacitor configuration
├── vite.config.ts                       # Vite build configuration
├── tsconfig.json                        # TypeScript configuration with @ alias
├── package.json                         # Dependencies, scripts
├── .env.example                         # Example environment variables
└── index.html                           # HTML entry point
```

## Directory Purposes

**src/pages/:**
- Purpose: Route-level page components (one per major route)
- Contains: Full-page views that compose multiple domain components
- Key files: `Dashboard.tsx`, `ExpensesPage.tsx`, `BudgetPage.tsx`, `AuthPage.tsx`
- Pattern: Fetch data, handle page-level state, dispatch modals

**src/components/:**
- Purpose: Reusable UI and feature components
- Contains: shadcn primitives, domain-specific components (TransactionItem), modals, dialogs
- Key subdirectories: `ui/` (primitives), `dashboard/`, `analytics/`, `savings/`, `reports/`
- Pattern: Single responsibility, receive props, no direct Supabase calls (use hooks from parent)

**src/hooks/:**
- Purpose: Custom React hooks for data fetching, context, and logic
- Contains: Auth context, Profile context, Currency context, domain hooks (useBudgets, useDashboardData, etc.)
- Key files: `useAuth.tsx`, `useBudgets.tsx`, `useDashboardData.tsx`, `useCurrency.tsx`
- Pattern: Manage Supabase queries, state updates, subscriptions; return data + methods

**src/lib/:**
- Purpose: Shared utilities and services used across the app
- Contains: Logger, Error handling, Security, Analytics, Image processing, Exchange rates, Calculations
- Key files: `logger.ts`, `errors.ts`, `security.ts`, `exchangeRateService.ts`, `imageProcessor.ts`
- Pattern: Pure functions or singletons, no React dependencies (except some)

**src/features/:**
- Purpose: Scoped feature modules with their own hooks/components
- Contains: Gamification (health score), Referrals (user referral system)
- Pattern: Self-contained with `/hooks/`, `/components/`, `/utils/` subdirectories
- Isolation: Features don't import from each other

**src/integrations/supabase/:**
- Purpose: External API integration (Supabase)
- Contains: Supabase client singleton, auto-generated types from schema
- Key files: `client.ts` (singleton), `types.ts` (Database interface)
- Pattern: Import client with `import { supabase } from '@/integrations/supabase/client'`

**src/types/:**
- Purpose: Core domain type definitions shared across the app
- Contains: Card, Transaction, Budget, Category, PaymentReminder, etc.
- Key files: `index.ts` (all types)
- Pattern: Interfaces/types with optional nested relations (e.g., Transaction includes Category)

**supabase/migrations/:**
- Purpose: Database schema version control
- Contains: SQL migration files for tables, columns, constraints
- Pattern: Numbered files (e.g., `001_initial_schema.sql`)

**supabase/functions/:**
- Purpose: Serverless Edge Functions for business logic
- Contains: Payment reminder scheduling, exchange rate fetching, webhook handlers
- Key: `schedule-payment-reminders/` - Scheduled cron job for notifications

**android/, ios/:**
- Purpose: Native mobile project directories
- Contains: Native code, resources, configuration for Android/iOS apps
- Pattern: Generated by Capacitor, managed by native IDEs (Android Studio, Xcode)

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React DOM render entry point
- `src/App.tsx`: Root component with providers, routing, app initialization logic
- `capacitor.config.ts`: Capacitor mobile app configuration (app ID, native plugins)

**Configuration:**
- `tsconfig.json`: Path aliases (@/*), compiler options
- `vite.config.ts`: Vite build, test setup (Vitest), PWA plugin config
- `capacitor.config.ts`: Mobile app ID, plugins, localhost dev settings
- `.env.example`: Template for environment variables (never commit `.env`)

**Core Logic:**
- `src/hooks/useAuth.tsx`: Authentication and session management
- `src/hooks/useBudgets.tsx`: Budget CRUD and spending calculations
- `src/hooks/useDashboardData.tsx`: Dashboard metrics aggregation
- `src/hooks/useCurrency.tsx`: Multi-currency with geolocation detection
- `src/lib/logger.ts`: Logging service with Sentry/Crashlytics support
- `src/lib/security.ts`: Input validation and rate limiting
- `src/lib/exchangeRateService.ts`: Exchange rate caching (6-hour TTL)

**Testing:**
- `src/test/setup.ts`: Vitest configuration, mock setup
- `src/lib/__tests__/`: Utility function tests
- `src/hooks/__tests__/`: Hook tests
- `src/components/__tests__/`: Component tests

## Naming Conventions

**Files:**
- Components: PascalCase, matches component name
  - Example: `AddTransactionModal.tsx` exports `AddTransactionModal`
- Hooks: camelCase with `use` prefix
  - Example: `useAuth.tsx` exports `useAuth` hook
- Utilities: camelCase, descriptive
  - Example: `exchangeRateService.ts`, `imageProcessor.ts`
- Types: Exported at bottom of file or in `src/types/index.ts`
  - Example: `export interface Transaction { ... }`

**Directories:**
- Feature modules: lowercase, descriptive
  - Example: `gamification/`, `referrals/`, `analytics/`
- Pages: PascalCase (treated like components)
  - Example: `Dashboard.tsx`, `ExpensesPage.tsx`, `AuthPage.tsx`
- Nested routes: lowercase
  - Example: `profile/`, `settings/`, `src/pages/profile/PersonalPage.tsx`

**Variables/Functions:**
- camelCase for functions and variables
- PascalCase for React components, classes, types
- ALL_CAPS for constants (rare)
- Prefixed with `_` for unused parameters (TypeScript convention)

**Hooks:**
- Always named with `use` prefix
- Context providers: useX + useXContext or XProvider + useX
- State setters: Omit `set` prefix in return (context provides `setCurrency()`)

## Where to Add New Code

**New Feature (e.g., "Goals Savings Tracker"):**
1. **Primary code:** Create `src/features/savings-tracker/` with:
   - `hooks/useSavingsTracker.ts` - Data fetching and state
   - `components/SavingsTrackerCard.tsx` - UI components
   - `utils/savingsCalculations.ts` - Pure logic
2. **Tests:** `src/features/savings-tracker/__tests__/useSavingsTracker.test.ts`
3. **Page:** `src/pages/SavingsTrackerPage.tsx` - Import hook and components
4. **Route:** Add to `src/App.tsx` routes
5. **Types:** Add domain types to `src/types/index.ts` if needed

**New Component/Modal (e.g., "EditGoalModal"):**
1. **Implementation:** `src/components/EditGoalModal.tsx`
2. **Tests:** `src/components/__tests__/EditGoalModal.test.tsx`
3. **Usage:** Import in page component, pass props + callback
4. **State management:** Use page-level useState for open/close, parent hook for data mutations

**New Utility/Helper:**
1. **Pure functions:** `src/lib/goalUtils.ts`
2. **Services (singletons):** `src/lib/goalService.ts`
3. **Tests:** `src/lib/__tests__/goalUtils.test.ts`
4. **Export:** Use `export function` for individual items or `export const` for objects

**New Page:**
1. **Location:** `src/pages/GoalsPage.tsx`
2. **Route:** Add to `src/App.tsx` routes
3. **Composition:** Import header from Layout, import domain components
4. **Data:** Call hooks (useSavingsGoals, useCurrency, etc.) at top level
5. **Structure:** Fetch data → render UI → handle modals/state

**Shared Utility Hook:**
1. **Location:** `src/hooks/useGoalCalculations.ts`
2. **Pattern:** Return object with computed values and refresh functions
3. **Tests:** `src/hooks/__tests__/useGoalCalculations.test.ts`
4. **Usage:** Import in multiple components/pages that need this logic

## Special Directories

**src/components/ui/:**
- Purpose: shadcn/Radix UI primitives (pre-built, not to be modified)
- Generated/Managed: Use `shadcn-ui` CLI to add new primitives
- Committed: Yes (checked into version control)
- Pattern: Import from here in domain components

**src/integrations/supabase/types.ts:**
- Purpose: Auto-generated TypeScript types from Supabase schema
- Generated: Via Supabase CLI (`supabase gen types typescript ...`)
- Committed: Yes (checked in, regenerate when schema changes)
- Manual Edit: Not recommended (regenerate from schema)

**supabase/migrations/:**
- Purpose: Database schema version control
- Generated: Create manually with sequential numbering
- Committed: Yes (required for schema tracking)
- Running: Applied automatically on Supabase deploy

**supabase/functions/:**
- Purpose: Serverless Edge Functions
- Generated: Create via `supabase functions new <name>`
- Committed: Yes (versioned with codebase)
- Deployed: Automatically on push or manual deploy

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Via `npm install` or `bun install`
- Committed: No (gitignored)
- Do not edit

**dist/:**
- Purpose: Production build output
- Generated: Via `npm run build`
- Committed: No (gitignored)
- Contents: Minified JavaScript, CSS, HTML

**.env:**
- Purpose: Local environment variables (secrets, API keys)
- Committed: No (gitignored, use `.env.example`)
- Never commit: Supabase keys, private API keys, auth tokens

**build/, .next/, out/:**
- Purpose: Framework-specific build artifacts
- Generated: By build tools (Vite, Next.js, etc.)
- Committed: No (gitignored)

---

*Structure analysis: 2026-03-19*
