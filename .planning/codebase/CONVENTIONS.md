# Coding Conventions

**Analysis Date:** 2026-03-19

## Naming Patterns

**Files:**
- PascalCase for components: `Dashboard.tsx`, `TransactionItem.tsx`, `AddTransactionModal.tsx`
- camelCase for utilities and hooks: `transactionUtils.ts`, `useAuth.tsx`, `useBudgets.tsx`, `logger.ts`
- Test files use same name as source with `.test.ts` or `.spec.ts` suffix
  - Example: `useAuth.tsx` → `useAuth.test.ts` or located in `__tests__/useAuth.test.ts`
- UI primitives in `src/components/ui/` use kebab-case: `responsive-drawer.tsx`, `alert-dialog.tsx`

**Functions:**
- camelCase for all functions: `calculateHealthScore()`, `sanitizeInput()`, `getTransactionCategoryName()`
- Utility functions that compute/derive data prefixed with `get`: `getTransactionCategoryName()`, `getTransactionCategoryColor()`
- Utility functions that validate prefixed with `is` or `validate`: `isValidEmail()`, `isRealExpense()`, `validatePasswordStrength()`
- Async operations use standard camelCase: `fetchTransactions()`, `createTransaction()`, `deleteTransaction()`

**Variables:**
- camelCase for all variables: `totalSpent`, `budgetAmount`, `currencySymbol`, `selectedYear`, `internalRevealed`
- Boolean variables use `is` or `has` prefix: `isAllowed`, `hasPermission`, `isRevealed`, `hasSavingsContributionThisMonth`
- Constants in camelCase (not SCREAMING_SNAKE_CASE): `maxAttempts = 5`, `windowMs = 60000`
- Type parameters use PascalCase: `<T>`, `<TData>`, `<TContext>`

**Types/Interfaces:**
- PascalCase for all types and interfaces: `Transaction`, `Budget`, `AuthContextType`, `TransactionItemProps`
- Props interfaces suffixed with `Props`: `TransactionItemProps`, `AddTransactionModalProps`
- Context types suffixed with `ContextType`: `AuthContextType`, `CurrencyContextType`, `ProfileContextType`
- Use `interface` for object shapes, `type` for unions and function signatures

**Hooks:**
- Always prefix with `use`: `useAuth()`, `useTransactions()`, `useCurrency()`, `useExchangeRate()`
- Hook names describe what they manage/provide: `usePaymentReminders()`, `usePermissions()`, `useVoiceInput()`
- Custom hooks are functions, not components

## Code Style

**Formatting:**
- 2-space indentation (enforced by ESLint)
- Semicolons required at end of statements
- No trailing commas in single-line constructs
- Multi-line imports/exports use trailing commas

**Linting:**
- Tool: ESLint with TypeScript support (`@typescript-eslint`)
- Config: `eslint.config.js` using flat config format
- Enabled rules: React Hooks rules (`react-hooks/recommended`)
- Warning: `react-refresh/only-export-components` - only export components from `.tsx` files when needed
- Disabled: `@typescript-eslint/no-unused-vars` - allows flexibility but monitor for dead code

**Line Length:**
- No enforced line length limit (project uses flexible wrapping)
- Readable component props and long strings can extend beyond 80 characters

## Import Organization

**Order:**
1. React and external libraries (React, third-party packages)
   ```typescript
   import React, { useState, useEffect } from 'react';
   import { motion } from 'framer-motion';
   import { format } from 'date-fns';
   ```

2. Internal `@/` alias imports (organized by layer)
   ```typescript
   import { useAuth } from '@/hooks/useAuth';
   import { supabase } from '@/integrations/supabase/client';
   import { Transaction } from '@/types';
   import { sanitizeInput } from '@/lib/security';
   import { Dashboard } from '@/pages/Dashboard';
   ```

3. Relative imports (rare, avoid deep paths)
   ```typescript
   import { childComponent } from './ChildComponent';
   ```

**Path Aliases:**
- Always use `@/` alias for imports from `src/`: `import { useAuth } from '@/hooks/useAuth'`
- Never use relative paths like `../../../hooks/useAuth`
- Configured in `tsconfig.json`: `"@/*": ["./src/*"]`

## Error Handling

**Pattern:**
- Use explicit `Error` objects: `return { error: new Error('Invalid email format') }`
- Errors returned in result object: `{ error: Error | null }`
- Functions that fail should return errors, not throw (for graceful handling)
- Use `logger` service for error logging in development/production

**Security Validation:**
- Input sanitization via `sanitizeInput()` for user text
- Email validation via `isValidEmail()` before signup/login
- Password strength validation via `validatePasswordStrength()`
- Numeric input validation via `sanitizeNumericInput()` to prevent overflow attacks
- Transaction data sanitization via `sanitizeTransactionData()` (merchant, amount, note)
- Always truncate long strings (merchant: 255 chars, notes: 1000 chars)

**Rate Limiting:**
- Use `loginRateLimiter` for auth attempts (5 max per 60s window)
- Use `apiRateLimiter` for general API calls (30 max per window)
- Methods: `isAllowed(key)`, `reset(key)`, `getResetTime(key)`

**Logging:**
- Use `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()`
- Prefix log messages with component/action: `'[Auth] onAuthStateChange'`, `'[Budget] Calculation'`
- Mask sensitive data (user IDs: `.slice(0, 8)`, never log passwords/tokens)
- Context object for structured logging: `logger.info('message', { userId, email, action })`

## Comments

**When to Comment:**
- Complex business logic: Health score calculation, budget status logic
- Non-obvious regex patterns: Password validation, command parsing
- Integration-specific behavior: OAuth flow, Capacitor platform detection
- Security-critical code: Rate limiting, input sanitization

**JSDoc/TSDoc:**
- Used sparingly for exported utilities and hooks with complex behavior
- Example: `sanitizeInput()` has multi-line docstring explaining XSS prevention
- Not required for simple getters/setters or self-documenting functions

**Comment Style:**
- Single-line comments for context: `// Map category icons or use defaults based on keywords`
- Multi-line comments for blocks:
  ```typescript
  /**
   * Validate email format
   */
  export function isValidEmail(email: string): boolean {
  ```

## Function Design

**Size:**
- Keep functions under 100 lines when possible
- Large components (100-200 lines) acceptable for feature pages like `Dashboard.tsx`
- Extract sub-logic into smaller utilities for reusability

**Parameters:**
- Use object destructuring for multiple parameters (more than 2-3)
  ```typescript
  function calculateHealthScore({
    totalSpent,
    totalBudget,
    hasActiveGoal,
    // ... more props
  }: HealthScoreInput)
  ```
- Single/paired parameters use positional args: `formatAmount(amount)`, `isValidEmail(email)`
- React components always receive single `Props` object

**Return Values:**
- Return `null` for missing values (not `undefined`)
- Return empty objects `{}` or arrays `[]` for empty collections (context-dependent)
- Error-returning functions use `{ error: Error | null }` pattern
- Pure utility functions return computed values directly

**Pure Functions:**
- Utility functions in `src/lib/` should be pure (no side effects)
- Examples: `calculateHealthScore()`, `sanitizeInput()`, `getTransactionCategoryName()`
- Exceptions: Services with initialization (Logger, ExchangeRateService) are singletons with state

## Module Design

**Exports:**
- Default export for main component/hook per file
  ```typescript
  export function useAuth() { ... }
  export const Dashboard = () => { ... }
  ```
- Named exports for utilities: `export function sanitizeInput() { ... }`
- Mix of default + named acceptable for complex modules with sub-utilities

**Barrel Files:**
- Not used in this codebase; each component/hook imported directly
- `src/components/ui/` files export single component each
- Benefits: Clearer dependencies, easier tree-shaking

**Organization Within Modules:**
1. Imports
2. Type definitions and interfaces
3. Constants
4. Utility functions (private helpers)
5. Main exported function/component
6. Sub-components (if any)

**Example Structure:**
```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import { Transaction } from '@/types';

// 2. Types
interface TransactionItemProps {
  transaction: Transaction;
}

// 3. Constants
const iconMap = { ... };

// 4. Utilities (private)
const getIcon = (tx: Transaction) => { ... };

// 5. Main export
export function TransactionItem(props: TransactionItemProps) { ... }
```

## Type Safety

**Strict Options:**
- `noImplicitAny: false` - Allows `any` when needed (pragmatic approach)
- `strictNullChecks: false` - Allows nullable values without explicit Optional
- `noUnusedLocals: false` - Unused variables not flagged (allows exploration)
- Uses TypeScript for type checking, not strict mode enforcement

**Type Definitions:**
- Core domain types centralized in `src/types/index.ts`
- Component prop types defined inline with `interface ComponentProps { ... }`
- Supabase generated types in `src/integrations/supabase/types.ts`
- Context types defined in context provider files

**Any Usage:**
- Acceptable for: Integration boundaries (Supabase, third-party libraries)
- Avoid for: Core business logic, custom data structures
- Use type assertions sparingly: `transaction as Transaction`

---

*Convention analysis: 2026-03-19*
