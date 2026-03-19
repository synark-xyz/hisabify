# Testing Patterns

**Analysis Date:** 2026-03-19

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vite.config.ts` with `test` object configuration
- Environment: jsdom (browser-like DOM for testing)

**Assertion Library:**
- Vitest built-in matchers (expect API, similar to Jest)
- Testing Library for React component testing

**Run Commands:**
```bash
npm test                  # Run tests in watch mode
npm run test:unit        # Run all tests once (ci mode)
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run E2E tests with UI
npm run test:all         # Run both unit and E2E tests
```

**Setup File:**
- `src/test/setup.ts` - Minimal setup importing `@testing-library/jest-dom`
- No global mocks or fixtures defined; mocking is inline per test file

## Test File Organization

**Location:**
- Co-located with source files using `__tests__/` directories within feature folders
- Alternative: `*.test.ts` or `*.spec.ts` suffix in same directory
- Examples:
  - `src/lib/__tests__/security.test.ts`
  - `src/features/gamification/__tests__/useHealthScore.test.ts`
  - `src/hooks/__tests__/useVoiceInput.test.ts`
  - `src/components/__tests__/BudgetFlow.integration.test.tsx`

**Naming:**
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.tsx`
- All included by Vitest pattern: `src/**/*.{test,spec}.{ts,tsx}`

**Coverage Configuration:**
- Provider: v8
- Reporters: text, html, lcov
- Included: `src/lib/**`, `src/hooks/**`, `src/features/**`
- Excluded: `src/integrations/**`, `src/components/ui/**`, test files themselves
- Thresholds (minimum): 7% lines, 6% functions, 6% branches

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';

describe('calculateHealthScore', () => {
  it('returns 100 when all signals are strong', () => {
    const score = calculateHealthScore({
      totalSpent: 0,
      totalBudget: 1000,
      hasActiveGoal: true,
      // ... more props
    });

    expect(score.total).toBe(100);
    expect(score.breakdown.savings).toBe(50);
    expect(score.insight).toContain('Emergency Fund');
  });

  it('rewards being under budget without every savings signal', () => {
    // Test case
  });
});
```

**Patterns:**
- Single suite per test file using top-level `describe()`
- Nested `describe()` blocks for logical grouping by functionality
- One `it()` per assertion focus (not combining unrelated assertions)
- Descriptive test names in plain English: `'should parse "spent X at Y"'`, `'returns error for weak password'`

**Setup/Teardown:**
- Use `beforeEach()` for shared test data/mocks before each test
- Use `vi.mock()` at file top for module mocks that apply to all tests
- No global `beforeAll()` found; each test is isolated

**Example Setup:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeInput } from '../security';

// Module-level mock
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

describe('sanitizeInput', () => {
  it('removes script tags', () => {
    expect(sanitizeInput('<script>alert(1)</script>hello')).toBe('hello');
  });
});
```

## Mocking

**Framework:** Vitest `vi` object (similar to Jest)

**Patterns - Module Mocks:**
```typescript
// Mock entire module
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  },
}));

// Usage in test
import { logger } from '@/lib/logger';
logger.warn('message'); // Vitest spy function
```

**Patterns - Function Mocks:**
```typescript
const mockFn = vi.fn();
const mockFn = vi.fn().mockReturnValue(true);
const mockFn = vi.fn().mockResolvedValue({ data: [] });

// Assertions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg');
expect(mockFn).toHaveBeenCalledTimes(3);
```

**What to Mock:**
- External libraries and APIs: Supabase, Capacitor, logger
- Complex integrations: HTTP requests, browser APIs
- Time-dependent functions: Use `vi.useFakeTimers()` for date tests

**What NOT to Mock:**
- Pure utility functions: Test them directly
- Core business logic: Test actual calculation/validation behavior
- Domain hooks: Mock Supabase calls, not useAuth itself
- Type system utilities: No mocking needed for types

**React Component Testing:**
```typescript
import { renderHook } from '@testing-library/react';
import { useVoiceInput } from '../useVoiceInput';

describe('useVoiceInput parseCommand', () => {
  it('should parse "spent X at Y"', () => {
    const { result } = renderHook(() => useVoiceInput());
    const parsed = result.current.parseCommand('spent 20 at Starbucks');

    expect(parsed).toMatchObject({
      amount: 20,
      merchant: 'starbucks',
      raw: 'spent 20 at Starbucks'
    });
  });
});
```

## Fixtures and Factories

**Test Data Patterns:**

1. **Builder Function Pattern** (used in `transactionUtils.test.ts`):
```typescript
function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    user_id: 'user-1',
    merchant: 'Test Merchant',
    amount: 10,
    type: 'expense',
    date: '2026-01-01',
    ...overrides,
  };
}

// Usage
const tx = makeTx({ amount: 50, merchant: 'Starbucks' });
```

2. **Inline Fixtures** (used in `BudgetFlow.integration.test.tsx`):
```typescript
const systemCategories = [
  { id: 'sys-1', name: 'Credit Card Payments', category_type: 'credit_card' },
  { id: 'sys-2', name: 'Utility Bills', category_type: 'utility' },
];

const transactions = [
  { amount: 50, category: { category_type: 'utility' } },
  { amount: 30, category: { category_type: 'credit_card' } },
];
```

**Location:**
- Test data defined at top of test file (after imports/mocks)
- Builder functions for domain objects (Transaction, etc.)
- Inline data for simple test cases
- No separate fixtures directory; co-located with tests

**No Factories/Seeds:**
- No complex factory library used
- Hand-rolled builders preferred for clarity
- Keeps tests self-contained and readable

## Coverage

**Requirements:**
- Minimum thresholds: 7% lines, 6% functions, 6% branches
- Coverage NOT enforced as gating criterion (soft threshold)
- Focus on testing critical paths, not hitting coverage % targets

**View Coverage:**
```bash
npm run test:coverage
# Generates HTML report in coverage/ directory
# View with: open coverage/index.html
```

**Coverage Tracking:**
- Reporter outputs text summary to console
- HTML report shows line-by-line coverage
- lcov format generated for CI/CD integration

## Test Types

**Unit Tests:**
- Scope: Single function or hook in isolation
- Approach: Pure function testing with various inputs
- Examples: `security.test.ts`, `healthScoreLogic.test.ts`, `transactionUtils.test.ts`
- All test library utilities in `src/lib/__tests__/`

**Integration Tests:**
- Scope: Multiple components working together or business logic flows
- Approach: Test how components interact with mocked external dependencies
- Examples: `BudgetFlow.integration.test.tsx` tests system category mapping + budget calculation
- Tests actual business logic without testing UI rendering

**E2E Tests:**
- Framework: Playwright 1.49.0
- Config: `playwright.config.ts`
- Scope: Full user flows in real browser
- Run: `npm run test:e2e`
- Not covered in codebase documentation (setup exists but tests not detailed)

## Common Patterns

**Async Testing:**
```typescript
describe('async functions', () => {
  it('should fetch data', async () => {
    const result = await fetchData();
    expect(result).toBeDefined();
  });

  // Hook-based async
  it('should handle async hook state', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => {
      expect(result.current.user).toBeDefined();
    });
  });
});
```

**Error Testing:**
```typescript
describe('error cases', () => {
  it('returns error for invalid email', () => {
    expect(isValidEmail('invalid')).toBe(false);
  });

  it('returns error message for weak password', () => {
    const error = validatePasswordStrength('weak');
    expect(error).toBe('Password must be at least 8 characters long');
  });

  it('should catch and return error object', async () => {
    const { error } = await signUp('email@test.com', 'weak');
    expect(error).toBeDefined();
    expect(error.message).toContain('must be at least 8');
  });
});
```

**Rate Limiting Tests** (unique pattern in security.test.ts):
```typescript
describe('loginRateLimiter', () => {
  it('allows up to max attempts', () => {
    const key = `unique-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(loginRateLimiter.isAllowed(key)).toBe(true);
    }
  });

  it('blocks the exceeding attempt', () => {
    const key = `unique-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 5; i++) loginRateLimiter.isAllowed(key);
    expect(loginRateLimiter.isAllowed(key)).toBe(false);
  });

  it('allows after manual reset', () => {
    const key = `unique-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 5; i++) loginRateLimiter.isAllowed(key);
    loginRateLimiter.reset(key);
    expect(loginRateLimiter.isAllowed(key)).toBe(true);
  });
});
```

**String Assertion Patterns:**
```typescript
// Positive assertions
expect(result).toBe('exact string');
expect(result).toContain('substring');
expect(result).toMatch(/regex/);

// Negative assertions
expect(result).not.toContain('forbidden');
expect(result).not.toMatch(/pattern/);

// Property checks
expect(result.length).toBe(64);
expect(str).toMatch(/^[0-9a-f]+$/); // Hex validation
```

## Testing Best Practices

**Do:**
- Test behavior, not implementation details
- Use descriptive test names that explain the scenario
- Keep tests focused (one assertion focus per test)
- Test edge cases (empty input, null, boundaries)
- Mock external dependencies consistently
- Use builders/factories for complex test data
- Keep tests near source code (`__tests__/` folders)

**Don't:**
- Test internal state of components (prefer behavioral assertions)
- Use vague test names like "test works" or "should handle stuff"
- Skip testing security-critical code (validation, sanitization)
- Mock pure functions (test them directly)
- Create shared test files that multiple test suites depend on
- Use skip/todo extensively (mark with `it.skip()` temporarily only)

## Incomplete/Missing Test Coverage

**Areas without dedicated tests:**
- Component rendering and UI interaction tests (using Testing Library selectors)
- Real-time subscription tests (Supabase channel subscriptions)
- Mobile-specific features (Capacitor permissions, geolocation)
- Voice input native bridge calls (renderHook tests parseCommand only, not listen())

---

*Testing analysis: 2026-03-19*
