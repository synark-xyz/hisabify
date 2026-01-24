# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a personal finance/wallet management application built with React, TypeScript, Vite, and Supabase. The app is called "Hisabify" and was originally generated via Lovable.dev. It supports multi-currency transactions, budgeting, savings goals, analytics, and PWA functionality.

## Development Commands

### Basic Operations
```bash
# Install dependencies
npm i

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Environment Setup
Copy `.env.example` to `.env` and configure:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anonymous key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

## Architecture

### Application Structure

**Provider Hierarchy** (from App.tsx):
```
ErrorBoundary
  → QueryClientProvider (React Query)
    → ThemeProvider
      → TooltipProvider
        → BrowserRouter
          → AuthProvider
            → ProfileProvider
              → CurrencyProvider
                → Routes
```

This nesting is critical: currency conversions depend on profile settings, which depend on authentication.

### Key Directories

- `src/pages/` - Route-level page components (Dashboard, Expenses, Analytics, Cards, Budget, Savings, Reports, Profile, Auth)
- `src/components/` - Reusable UI components and feature-specific components
- `src/components/ui/` - shadcn-ui components (base UI library)
- `src/hooks/` - Custom React hooks for business logic and state management
- `src/lib/` - Utility functions, schemas, error handling, and export utilities
- `src/integrations/supabase/` - Auto-generated Supabase client and types
- `src/types/` - TypeScript type definitions
- `supabase/` - Database migrations and functions

### Core Hooks (Custom Business Logic)

All custom hooks follow the pattern of using Supabase for data persistence and React Query is managed at the App level:

- **useAuth** - Authentication state, sign in/up/out (wraps Supabase auth)
- **useTransactions** - Fetches, filters, sorts transactions with real-time updates; handles multi-currency conversion
- **useCurrency** - Global currency preference with version tracking for cache invalidation
- **useProfile** - User profile data from Supabase
- **useBudgets** - Budget CRUD and tracking
- **useSavingsGoals** - Savings goal management
- **useExchangeRate** - Currency conversion utilities
- **useConvertedAmount** - Hook for converting amounts based on current user currency
- **useTransactions** - Has built-in real-time Supabase subscriptions; disable with `enableRealtime: false` if needed

### Data Flow Pattern

1. **Authentication**: `useAuth` manages user session via Supabase auth
2. **Data Fetching**: Custom hooks query Supabase with user_id filter
3. **Real-time Updates**: Most hooks use Supabase's real-time subscriptions
4. **Currency Handling**: Transactions store original currency + converted amounts; `useExchangeRate` handles conversions
5. **State Management**: React Query for server state, Context providers for global app state (theme, currency, profile)

### Routing & Protection

- **ProtectedRoute**: Requires authentication, redirects to `/auth`
- **AuthRoute**: Redirects authenticated users to `/` (dashboard)
- All main features are behind ProtectedRoute

### Supabase Integration

- Client configured in `src/integrations/supabase/client.ts`
- Types auto-generated in `src/integrations/supabase/types.ts`
- Uses localStorage for session persistence
- Real-time subscriptions enabled for transactions and other entities

### Multi-Currency Support

Transactions support multi-currency with these fields:
- `amount_original` - Original transaction amount
- `currency_original` - Original currency code
- `amount_converted` - Converted to base currency
- `currency_base` - User's base currency at time of transaction
- `exchange_rate` - Exchange rate used
- `rate_timestamp` - When rate was fetched
- `exchange_source` - Source of exchange rate

When displaying transactions, always use `convertedAmount` from `useTransactions` hook which handles conversion to current user currency.

### PWA Configuration

- Configured via `vite-plugin-pwa` in `vite.config.ts`
- Service worker uses NetworkFirst strategy for Supabase calls
- CacheFirst for images
- Manifest at `public/manifest.json`

### Component Patterns

- shadcn-ui components in `src/components/ui/` - do not modify these directly
- Feature components use composition of ui components
- Forms use `react-hook-form` with `zod` schemas
- Modals/dialogs for create/edit operations
- Toast notifications via `sonner` and shadcn toast

### Import Alias

Use `@/` alias for all imports from `src/`:
```typescript
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
```

### Styling

- Tailwind CSS with custom theme configuration in `tailwind.config.ts`
- Theme switching via `useTheme` hook (supports light/dark modes)
- Color system uses CSS variables defined in `src/index.css`
- Animations via `tailwindcss-animate`

### Type Safety

- Strict TypeScript configuration
- Database types auto-generated from Supabase
- Manual types in `src/types/index.ts` for app-specific models
- ESLint configured with React hooks rules (unused vars rule disabled)

## Common Patterns

### Adding a New Feature with Data

1. Add Supabase table/migration in `supabase/migrations/`
2. Update types in `src/integrations/supabase/types.ts` (or regenerate)
3. Create custom hook in `src/hooks/` following existing patterns
4. Create components in `src/components/`
5. Add page in `src/pages/` if needed
6. Add route in `App.tsx`

### Creating Forms

Use `react-hook-form` + `zod` + shadcn form components:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
```

### Handling Currency

Always use `useCurrency()` hook to get current user currency and `useConvertedAmount()` or `convertAmount()` from `useExchangeRate()` for conversions. Never hardcode currency symbols or assume USD.

### Real-time Updates

Use Supabase real-time subscriptions in custom hooks:
```typescript
const channel = supabase
  .channel('table-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name', filter: `user_id=eq.${user.id}` }, 
    () => refetch()
  )
  .subscribe();
```

## Notes

- This project uses bun.lockb but package-lock.json is also present; npm is the documented package manager
- Lovable-specific: `lovable-tagger` plugin is enabled in development mode for component tracking
- Development server runs on port 8080 (not the default Vite port)
- ESLint disables `@typescript-eslint/no-unused-vars` warnings
