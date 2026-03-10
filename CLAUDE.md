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
```

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
- **Storage:** Supabase Storage with RLS policies
- **Features:** Extracts merchant, amount, date; pre-fills transaction form
- **Documentation:** `docs/RECEIPT_IMAGE_OPTIMIZATION.md`

### Voice Input for Transactions

- **Component:** `VoiceInputFlow.tsx` - Enhanced voice recording interface
- **Technology:** Web Speech API (browser native)
- **Hook:** `useVoiceInput.ts` - Web Speech API integration
- **Hook:** `usePermissions.ts` - Runtime permission handling
- **Features:**
  - Real-time transcription display
  - Automatic merchant/amount parsing (~70-80% accuracy)
  - Pulsing animation during recording
  - Permission checking and error handling
  - "Use This" button to pre-fill transaction form
  - Tips for better voice input
- **Limitations:**
  - Requires browser support (Chrome, Safari, Edge - full; Firefox - partial)
  - English only (Phase 2)
  - Regex-based parsing (AI upgrade in Phase 8)

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

**Run tests:**
```bash
npm test
# or
bun test
```

**Test setup:** `src/test/setup.ts`
**Test pattern:** Unit tests for pure functions (e.g., `healthScoreLogic.test.ts`)

**When writing tests:**
- Use Vitest + Testing Library
- Test pure functions in `__tests__/` folders
- Mock Supabase client for integration tests

## Capacitor Mobile

**Config:** `capacitor.config.ts`
**App ID:** `io.synark.hisabify`

**Build for mobile:**
```bash
npm run build
npx cap sync
npx cap open ios
npx cap open android
```

**Mobile-specific features:**
- Pull-to-refresh (`usePullToRefresh.tsx`)
- Mobile-responsive bottom navigation
- Geolocation for currency detection

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
| `docs/RECEIPT_IMAGE_OPTIMIZATION.md` | Receipt image optimization spec |

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
