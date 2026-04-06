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
# Install dependencies (prefer bun, fallback to npm)
bun install
# or
npm install

# Run development server (localhost:8080)
bun dev
# or
npm run dev

# Managed dev server (mobile-friendly)
npm run dev:managed

# Build for production
bun run build
# or
npm run build

# Build for development mode
npm run build:dev

# Run linter
npm run lint

# Run tests
npm test
# or
bun test

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
├─ ReceiptUpload.tsx       # OCR receipt upload (Tesseract.js)
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
- **Documentation:** `docs/UNIFIED_FAB_IMPLEMENTATION.md`

### Receipt Upload with OCR & Image Optimization

- **Component:** `ReceiptUpload.tsx` - Receipt capture with OCR
- **Technology:** Tesseract.js for client-side text extraction
- **Image Processing:** `src/lib/imageProcessor.ts`
- **Optimization:** Compress to <500KB while preserving text readability
- **Storage:** Supabase Storage with RLS policies (bucket: `receipts`)
- **Features:** Extracts merchant, amount, date; pre-fills transaction form
- **Mobile Permissions:**
  - Android: `CAMERA`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE`
  - iOS: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`
  - Runtime permission flow: `ensurePermission('camera')` and `ensurePermission('photos')`
- **Documentation:** `docs/UNIFIED_FAB_IMPLEMENTATION.md`

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

- `PremiumGuard` component wraps premium features
- `useSubscription()` hook checks entitlement
- Subscription data in `users.subscription_type`
- Stripe integration planned (see TRD.md)

## Testing

**Framework:** Vitest + Testing Library (with jsdom)

**Run tests:**
```bash
npm test
# or
bun test
```

**Test Setup:** `src/test/setup.ts`

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

## Capacitor Mobile

**Config:** `capacitor.config.ts`
**App ID:** `io.synark.hisabify`

**Localhost Development Workflow:**
1. Find your local IP: `npm run local-ip`
2. Update `capacitor.config.ts`:
   - Set `USE_LOCALHOST = true`
   - Android Emulator: Use `http://10.0.2.2:8080` (default)
   - Android Device: Use your computer's IP (e.g., `http://192.168.1.100:8080`)
   - iOS Simulator: Use `http://localhost:8080`
3. Start dev server: `npm run dev`
4. Run on device: `npm run dev:android` or `npm run dev:ios`

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

**Documentation:** See `CAPACITOR_LOCALHOST_SETUP.md` for detailed setup guide

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
| `src/components/Layout.tsx` | Main layout wrapper |
| `src/components/InputMethodSheet.tsx` | Unified FAB action menu (3 options) |
| `src/components/VoiceInputFlow.tsx` | Enhanced voice memo UI with animations |
| `src/components/ReceiptUpload.tsx` | Receipt OCR + storage |
| `TRD.md` | Technical requirements & architecture |
| `PRD.md` | Product requirements & roadmap |
| `docs/UNIFIED_FAB_IMPLEMENTATION.md` | Unified FAB architecture & roadmap |
| `docs/PERMISSIONS_FIX.md` | Complete guide for runtime permissions |
| `CAPACITOR_LOCALHOST_SETUP.md` | Mobile localhost development setup |

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
  - Example: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
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
